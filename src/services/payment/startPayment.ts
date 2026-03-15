import { and, eq, gt, isNotNull, isNull, or } from "drizzle-orm";

import type { SignupID, StartPaymentResponse } from "@/models";
import { PaymentMode, PaymentStatus, SignupStatus } from "@/models";

import { env } from "@/env";
import { db } from "../../db";
import { activeSignupCutoff } from "../../db/filters";
import { payments, signups } from "../../db/schema";
import { assignSignupPositions } from "../signups/assignSignupPositions";
import { NoSuchSignup } from "../signups/errors";
import {
  OnlinePaymentsDisabled,
  PaymentInProgress,
  PaymentNotRequired,
  SignupAlreadyPaid,
  SignupInQueue,
  SignupNotConfirmed,
} from "./errors";
import { createCheckoutSession, getStripe, refreshCheckoutSession } from "./stripe";

function validateSignupForPayment(
  signup: { confirmedAt: Date | null; price: number | null },
  status: SignupStatus | null,
) {
  if (!signup.confirmedAt) throw new SignupNotConfirmed("Signup must be confirmed before payment");
  if (signup.price == null || signup.price <= 0) throw new PaymentNotRequired("This signup does not require payment");
  if (status !== SignupStatus.IN_QUOTA && status !== SignupStatus.IN_OPEN_QUOTA) {
    throw new SignupInQueue("Cannot pay while in queue");
  }
}

async function createPayment(signupId: SignupID): Promise<string> {
  const expiresAt = new Date(
    Date.now() + env.STRIPE_CHECKOUT_EXPIRY_MINS * 60_000 + (env.STRIPE_CHECKOUT_EXPIRY_MINS === 30 ? 30_000 : 0),
  );

  const cutoff = activeSignupCutoff();

  const [payment, signup] = await db.transaction(async (tx) => {
    // FOR UPDATE lock stays as db.select
    const [freshSignup] = await tx
      .select()
      .from(signups)
      .where(
        and(
          eq(signups.id, signupId),
          isNull(signups.deletedAt),
          or(isNotNull(signups.confirmedAt), gt(signups.createdAt, cutoff)),
        ),
      )
      .for("update");

    if (!freshSignup) throw new NoSuchSignup("Signup not found");

    // Compute status under lock
    const signupWithEvent = await tx.query.signups.findFirst({
      where: { id: signupId },
      columns: {},
      with: {
        quota: {
          columns: {},
          with: {
            event: {
              columns: { id: true, openQuotaSize: true },
              with: {
                quotas: {
                  where: { deletedAt: { isNull: true } },
                  columns: { id: true, size: true },
                  with: {
                    signups: {
                      where: {
                        deletedAt: { isNull: true },
                        OR: [{ confirmedAt: { isNotNull: true } }, { createdAt: { gt: activeSignupCutoff() } }],
                      },
                      orderBy: { createdAt: "asc" },
                      columns: { id: true, quotaId: true, createdAt: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!signupWithEvent?.quota?.event) throw new NoSuchSignup("Signup not found");
    const paymentEvent = signupWithEvent.quota.event;
    const allActiveSignups = paymentEvent.quotas
      .flatMap((q) => q.signups)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
    const positionMap = assignSignupPositions(
      allActiveSignups.map((s) => ({ id: s.id, quotaId: s.quotaId })),
      paymentEvent.quotas.map((q) => ({ id: q.id, size: q.size })),
      paymentEvent.openQuotaSize,
    );
    const computedStatus = positionMap.get(signupId)?.status ?? null;
    validateSignupForPayment(freshSignup, computedStatus);

    const [newPayment] = await tx
      .insert(payments)
      .values({
        signupId,
        amount: freshSignup.price!,
        currency: freshSignup.currency!,
        products: freshSignup.products!,
        expiresAt,
      })
      .returning();

    return [newPayment, freshSignup] as const;
  });

  let session;
  try {
    session = await createCheckoutSession(signup, payment);
  } catch (error) {
    await db
      .update(payments)
      .set({ status: PaymentStatus.CREATION_FAILED, updatedAt: new Date() })
      .where(eq(payments.id, payment.id));
    throw error;
  }

  try {
    await db
      .update(payments)
      .set({ status: PaymentStatus.PENDING, stripeCheckoutSessionId: session.id, updatedAt: new Date() })
      .where(eq(payments.id, payment.id));
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P0001") {
      throw new PaymentInProgress("Payment creation failed due to concurrent update");
    }
    throw error;
  }

  return session.url!;
}

async function handlePendingPayment(
  signupId: SignupID,
  payment: { stripeCheckoutSessionId: string | null },
): Promise<string> {
  const session = await refreshCheckoutSession(payment);
  switch (session.status!) {
    case "complete":
      throw new SignupAlreadyPaid("This signup has already been paid");
    case "expired":
      return createPayment(signupId);
    case "open":
      return session.url!;
    case null:
      throw new Error("Stripe session has null status");
    default:
      throw new Error(`Unhandled Stripe session status: ${session.status! satisfies never}`);
  }
}

/** Start a payment for a signup. */
// eslint-disable-next-line import/prefer-default-export
export async function startPayment(signupId: SignupID): Promise<StartPaymentResponse> {
  getStripe();

  // Use relational query to get signup with event info + all signups for position computation
  const signupRow = await db.query.signups.findFirst({
    where: {
      id: signupId,
      deletedAt: { isNull: true },
      OR: [{ confirmedAt: { isNotNull: true } }, { createdAt: { gt: activeSignupCutoff() } }],
    },
    columns: { id: true, confirmedAt: true, price: true },
    with: {
      quota: {
        columns: {},
        with: {
          event: {
            columns: { payments: true, openQuotaSize: true },
            with: {
              quotas: {
                where: { deletedAt: { isNull: true } },
                columns: { id: true, size: true },
                with: {
                  signups: {
                    where: {
                      deletedAt: { isNull: true },
                      OR: [{ confirmedAt: { isNotNull: true } }, { createdAt: { gt: activeSignupCutoff() } }],
                    },
                    orderBy: { createdAt: "asc" },
                    columns: { id: true, quotaId: true, createdAt: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!signupRow?.quota?.event) throw new NoSuchSignup("Signup not found");
  if (signupRow.quota.event.payments !== PaymentMode.ONLINE)
    throw new OnlinePaymentsDisabled("Online payments are not enabled for this event");

  // Compute position on-the-fly
  const outerEvent = signupRow.quota.event;
  const allSignups = outerEvent.quotas
    .flatMap((q) => q.signups)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  const outerPositionMap = assignSignupPositions(
    allSignups.map((s) => ({ id: s.id, quotaId: s.quotaId })),
    outerEvent.quotas.map((q) => ({ id: q.id, size: q.size })),
    outerEvent.openQuotaSize,
  );
  const computedStatus = outerPositionMap.get(signupId)?.status ?? null;
  validateSignupForPayment(signupRow, computedStatus);

  // Check for existing active payment
  const activePayment = await db.query.payments.findFirst({
    where: {
      signupId,
      status: { in: [PaymentStatus.CREATING, PaymentStatus.PENDING, PaymentStatus.PAID] },
    },
    columns: { id: true, status: true, stripeCheckoutSessionId: true },
  });

  if (!activePayment) {
    const paymentUrl = await createPayment(signupId);
    return { paymentUrl };
  }

  switch (activePayment.status) {
    case PaymentStatus.PAID:
      throw new SignupAlreadyPaid("This signup has already been paid");
    case PaymentStatus.PENDING: {
      const paymentUrl = await handlePendingPayment(signupId, activePayment);
      return { paymentUrl };
    }
    case PaymentStatus.CREATING:
      throw new PaymentInProgress("Payment creation already in progress");
    default:
      throw new Error(`Invalid active payment status: ${activePayment.status}`);
  }
}

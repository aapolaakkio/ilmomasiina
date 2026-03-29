import { and, eq, gt, isNotNull, isNull, or } from "drizzle-orm";

import { AuditEvent, PaymentMode, PaymentStatus, type SignupID, SignupStatus } from "@/db/schema";
import type { AuditLogger } from "@/auditlog";
import { env } from "@/env";
import { db } from "../../db";
import { activeSignupCutoff } from "../../db/filters";
import { payments, signups } from "../../db/schema";
import { computePositionsFromEvent } from "../signups/assignSignupPositions";
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

/** Statuses that block creating a new payment (relational filter: `status: { in: [...] }`). */
const ACTIVE_PAYMENT_STATUSES = [PaymentStatus.CREATING, PaymentStatus.PENDING, PaymentStatus.PAID] as const;

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

async function createPayment(signupId: SignupID, auditLogger: AuditLogger) {
  const expiresAt = new Date(
    Date.now() + env.STRIPE_CHECKOUT_EXPIRY_MINS * 60_000 + (env.STRIPE_CHECKOUT_EXPIRY_MINS === 30 ? 30_000 : 0),
  );

  const cutoff = activeSignupCutoff();

  const [payment, signup, eventInfo] = await db.transaction(async (tx) => {
    // FOR UPDATE lock stays as db.select
    const [freshSignup] = await tx
      .select({
        id: signups.id,
        quotaId: signups.quotaId,
        confirmedAt: signups.confirmedAt,
        price: signups.price,
        currency: signups.currency,
        products: signups.products,
        email: signups.email,
        language: signups.language,
      })
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

    // Position graph only (signup row already locked above)
    const quotaWithEvent = await tx.query.quotas.findFirst({
      where: { id: { eq: freshSignup.quotaId } },
      columns: {},
      with: {
        event: {
          columns: { id: true, title: true, openQuotaSize: true },
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
    });
    if (!quotaWithEvent?.event) throw new NoSuchSignup("Signup not found");
    const computedStatus = computePositionsFromEvent(quotaWithEvent.event).get(signupId)?.status ?? null;
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

    return [newPayment, freshSignup, quotaWithEvent.event] as const;
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
      .set({
        status: PaymentStatus.PENDING,
        stripeCheckoutSessionId: session.id,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P0001") {
      throw new PaymentInProgress("Payment creation failed due to concurrent update");
    }
    throw error;
  }

  await auditLogger(AuditEvent.START_PAYMENT, {
    signupId,
    event: { id: eventInfo.id, title: eventInfo.title },
  });

  return session.url!;
}

async function handlePendingPayment(
  signupId: SignupID,
  payment: { stripeCheckoutSessionId: string | null },
  auditLogger: AuditLogger,
) {
  const session = await refreshCheckoutSession(payment, auditLogger);
  switch (session.status!) {
    case "complete":
      throw new SignupAlreadyPaid("This signup has already been paid");
    case "expired":
      return createPayment(signupId, auditLogger);
    case "open":
      return session.url!;
    case null:
      throw new Error("Stripe session has null status");
    default:
      throw new Error(`Unhandled Stripe session status: ${session.status! satisfies never}`);
  }
}

/** Start a payment for a signup. */
export async function startPayment(signupId: SignupID, auditLogger: AuditLogger) {
  getStripe();

  // Relational query API (`db.query.*`, not deprecated `db._query`): signup + graph + blocking payment in one round trip
  const signupRow = await db.query.signups.findFirst({
    where: {
      id: { eq: signupId },
      deletedAt: { isNull: true },
      OR: [{ confirmedAt: { isNotNull: true } }, { createdAt: { gt: activeSignupCutoff() } }],
    },
    columns: { id: true, confirmedAt: true, price: true },
    with: {
      payments: {
        where: { status: { in: [...ACTIVE_PAYMENT_STATUSES] } },
        columns: { id: true, status: true, stripeCheckoutSessionId: true },
        limit: 1,
      },
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
  const computedStatus = computePositionsFromEvent(signupRow.quota.event).get(signupId)?.status ?? null;
  validateSignupForPayment(signupRow, computedStatus);

  const activePayment = signupRow.payments[0];

  if (!activePayment) {
    const paymentUrl = await createPayment(signupId, auditLogger);
    return { paymentUrl };
  }

  switch (activePayment.status) {
    case PaymentStatus.PAID:
      throw new SignupAlreadyPaid("This signup has already been paid");
    case PaymentStatus.PENDING: {
      const paymentUrl = await handlePendingPayment(signupId, activePayment, auditLogger);
      return { paymentUrl };
    }
    case PaymentStatus.CREATING:
      throw new PaymentInProgress("Payment creation already in progress");
    default:
      throw new Error(`Invalid active payment status: ${activePayment.status}`);
  }
}

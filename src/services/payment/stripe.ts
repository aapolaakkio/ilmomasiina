import { and, eq } from "drizzle-orm";
import Stripe from "stripe";

import { PaymentID, PaymentStatus, type ProductSchema, SignupID } from "@/db/schema";

import { env } from "@/env";
import { type DrizzleDb, db } from "../../db";
import { payments } from "../../db/schema";
import { sendPaymentConfirmationMail } from "../../mail/signups";
import { generateToken } from "../signups/editTokens";
import { OnlinePaymentsDisabled, PaymentInProgress, PaymentRateLimited, SignupAlreadyPaid } from "./errors";

const stripeClient: Stripe | null = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    })
  : null;

export function getStripe() {
  if (!stripeClient) throw new OnlinePaymentsDisabled("Online payments are not enabled on this server");
  return stripeClient;
}

interface CheckoutSignup {
  id: SignupID;
  email: string | null;
  language: string | null;
}

interface CheckoutPayment {
  id: PaymentID;
  signupId: SignupID;
  products: ProductSchema[];
  currency: string;
  expiresAt: Date;
}

export async function createCheckoutSession(signup: CheckoutSignup, payment: CheckoutPayment) {
  const stripe = getStripe();
  const editToken = generateToken(signup.id);
  const returnUrl = `${env.BASE_URL}/payment/${signup.id}/${editToken}`;

  const lineItems = payment.products.map((product) => ({
    price_data: {
      currency: payment.currency.toLowerCase(),
      product_data: { name: product.name },
      unit_amount: product.unitPrice,
    },
    quantity: product.amount,
  }));

  try {
    return await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "hosted",
      line_items: lineItems,
      allow_promotion_codes: true,
      customer_email: signup.email ?? undefined,
      success_url: returnUrl,
      cancel_url: returnUrl,
      expires_at: Math.floor(payment.expiresAt.getTime() / 1000),
      branding_settings: env.STRIPE_BRANDING_JSON,
      metadata: { signupId: payment.signupId, paymentId: String(payment.id) },
    });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeRateLimitError) throw new PaymentRateLimited("Rate limit exceeded");
    throw err;
  }
}

export async function checkoutSessionStatusUpdated(
  sessionId: Stripe.Checkout.Session["id"],
  status: Stripe.Checkout.Session.Status | null,
) {
  if (!sessionId) throw new Error("Invalid Stripe session ID");

  switch (status) {
    case "complete": {
      const updated = await db
        .update(payments)
        .set({
          status: PaymentStatus.PAID,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(payments.stripeCheckoutSessionId, sessionId), eq(payments.status, PaymentStatus.PENDING)))
        .returning();
      if (updated.length > 0) {
        const payment = updated[0];
        const signupRow = await db.query.signups.findFirst({
          where: { id: { eq: payment.signupId } },
          columns: { id: true, email: true, language: true },
          with: {
            quota: {
              columns: {},
              with: {
                event: {
                  columns: {
                    deletedAt: true,
                    title: true,
                    date: true,
                    location: true,
                    verificationEmail: true,
                    payments: true,
                  },
                  with: {
                    languages: {
                      columns: { language: true, title: true, location: true, verificationEmail: true },
                    },
                  },
                },
              },
            },
          },
        });
        if (signupRow?.quota?.event) {
          await sendPaymentConfirmationMail(payment, signupRow, signupRow.quota.event);
        }
      }
      break;
    }
    case "expired": {
      await db
        .update(payments)
        .set({ status: PaymentStatus.EXPIRED, updatedAt: new Date() })
        .where(and(eq(payments.stripeCheckoutSessionId, sessionId), eq(payments.status, PaymentStatus.PENDING)));
      break;
    }
    case "open":
      break;
    case null:
      throw new Error("Stripe session has null status");
    default:
      throw new Error(`Unhandled Stripe session status: ${status satisfies never}`);
  }
}

export async function refreshCheckoutSession(payment: { stripeCheckoutSessionId: string | null }) {
  const stripe = getStripe();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(payment.stripeCheckoutSessionId!);
  } catch (err) {
    if (err instanceof Stripe.errors.StripeRateLimitError) throw new PaymentRateLimited("Rate limit exceeded");
    throw err;
  }
  await checkoutSessionStatusUpdated(session.id, session.status);
  return session;
}

export async function expirePaymentForSignupUpdate(payment: {
  id: PaymentID;
  status: PaymentStatus;
  stripeCheckoutSessionId: string | null;
}) {
  const stripe = getStripe();

  switch (payment.status) {
    case PaymentStatus.PENDING:
      try {
        await stripe.checkout.sessions.expire(payment.stripeCheckoutSessionId!);
      } catch (err) {
        if (
          err instanceof Stripe.errors.StripeInvalidRequestError ||
          err instanceof Stripe.errors.StripeRateLimitError
        ) {
          console.error("Failed to expire checkout session for updating signup:", err);
          return;
        }
        throw err;
      }
      await db
        .update(payments)
        .set({ status: PaymentStatus.EXPIRED, updatedAt: new Date() })
        .where(eq(payments.id, payment.id));
      break;

    case PaymentStatus.CREATING:
      try {
        await db
          .update(payments)
          .set({ status: PaymentStatus.CREATION_FAILED, updatedAt: new Date() })
          .where(eq(payments.id, payment.id));
      } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P0001") {
          console.error("Failed to expire CREATING payment for updating signup:", error);
          return;
        }
        throw error;
      }
      break;

    case PaymentStatus.PAID:
      break;

    case PaymentStatus.EXPIRED:
    case PaymentStatus.CREATION_FAILED:
    case PaymentStatus.REFUNDED:
      throw new Error(`Invalid active payment status: ${payment.status}`);
    default:
      throw new Error(`Unknown payment status: ${payment.status}`);
  }
}

export async function expireExistingPaymentsForSignupUpdate(signupId: SignupID) {
  const activePayments = await db.query.payments.findMany({
    where: {
      signupId: { eq: signupId },
      status: {
        in: [PaymentStatus.CREATING, PaymentStatus.PENDING, PaymentStatus.PAID],
      },
    },
    columns: { id: true, status: true, stripeCheckoutSessionId: true },
  });

  await Promise.all(activePayments.map((payment) => expirePaymentForSignupUpdate(payment)));
}

export async function checkForConflictingPaymentsForSignupUpdate(
  signupId: SignupID,
  tx: DrizzleDb,
  ignorePaid = false,
) {
  const conflicting = await tx.query.payments.findFirst({
    where: {
      signupId: { eq: signupId },
      status: {
        in: [PaymentStatus.CREATING, PaymentStatus.PENDING, PaymentStatus.PAID],
      },
    },
    columns: { id: true, status: true },
  });

  if (conflicting?.status === PaymentStatus.PAID) {
    if (!ignorePaid) throw new SignupAlreadyPaid("This signup has already been paid");
  } else if (conflicting) {
    throw new PaymentInProgress("Active payment exists for this signup");
  }
}

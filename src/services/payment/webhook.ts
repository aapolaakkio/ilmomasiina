import Stripe from "stripe";

import type { AuditLogger } from "@/auditlog";
import { env } from "@/env";
import { checkoutSessionStatusUpdated, getStripe } from "./stripe";

/** Handle an incoming Stripe webhook event. */
export async function handleStripeWebhook(rawBody: string | Buffer, signature: string, auditLogger: AuditLogger) {
  const stripe = getStripe();

  if (!env.STRIPE_WEBHOOK_SECRET) {
    return {
      ok: false,
      error: "Stripe webhooks are not configured",
      status: 500,
    };
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return {
      ok: false,
      error: "Webhook signature verification failed",
      status: 400,
    };
  }

  switch (event.type) {
    case "checkout.session.completed":
      await checkoutSessionStatusUpdated(event.data.object.id, "complete", auditLogger, true);
      break;
    case "checkout.session.expired":
      await checkoutSessionStatusUpdated(event.data.object.id, "expired", auditLogger, true);
      break;
    default:
      break;
  }

  return { ok: true };
}

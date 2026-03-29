import { ManualPaymentStatus, PaymentMode, PaymentStatus, SignupPaymentStatus } from "@/db/schema";

import { env } from "@/env";

// Type for a signup row (or partial row) from Drizzle queries
interface SignupRow {
  confirmedAt: Date | null;
  createdAt: Date;
  price?: number | null;
  manualPaymentStatus?: string | null;
}

// Type for a payment row from Drizzle queries
interface PaymentRow {
  status: string;
}

/** Whether the signup has been confirmed (filled in after creation). */
export function isConfirmed(signup: Pick<SignupRow, "confirmedAt">) {
  return signup.confirmedAt != null;
}

/** The time this signup must be confirmed by before it expires. */
export function getConfirmableUntil(signup: Pick<SignupRow, "createdAt">) {
  return new Date(signup.createdAt.getTime() + Number(env.SIGNUP_CONFIRM_MINS || 30) * 60 * 1000);
}

/** The time this signup is editable until, regardless of signups closing. */
export function getEditableAtLeastUntil(signup: Pick<SignupRow, "createdAt">) {
  if (env.SIGNUP_CONFIRM_AFTER_CLOSE) {
    return new Date(signup.createdAt.getTime() + Number(env.SIGNUP_CONFIRM_MINS || 30) * 60 * 1000);
  }
  return signup.createdAt;
}

/**
 * Determines the effective end date of the event, matching the Sequelize model getter.
 * Returns the latest of endDate, date, registrationEndDate (as a timestamp), or null if none set.
 */
export function getEffectiveEndDate(event: {
  date: Date | null;
  endDate: Date | null;
  registrationEndDate: Date | null;
}) {
  const endDates = [event.endDate, event.date, event.registrationEndDate]
    .filter((date): date is Date => date != null)
    .map((date) => date.getTime());
  if (!endDates.length) return null;
  return endDates.reduce((lhs, rhs) => Math.max(lhs, rhs));
}

/** Whether payments are enabled for the event. */
export function paymentsEnabled(event: { payments: string }) {
  return event.payments !== PaymentMode.DISABLED;
}

/**
 * Computes the effective payment status for a signup based on its payments and manual status.
 * Replaces Sequelize's `Signup.effectivePaymentStatus` getter.
 */
export function getEffectivePaymentStatus(
  signup: Pick<SignupRow, "price" | "manualPaymentStatus">,
  signupPayments: PaymentRow[],
) {
  const paidPayment = signupPayments.some((p) => p.status === PaymentStatus.PAID);
  const refundedPayment = signupPayments.some((p) => p.status === PaymentStatus.REFUNDED);

  // If paid online or manually, it's paid
  if (paidPayment || signup.manualPaymentStatus === ManualPaymentStatus.PAID) return SignupPaymentStatus.PAID;
  // If refunded online or manually, it's refunded
  if (refundedPayment || signup.manualPaymentStatus === ManualPaymentStatus.REFUNDED)
    return SignupPaymentStatus.REFUNDED;
  // If no need to pay, don't check further
  if (signup.price == null || signup.price <= 0) return null;
  // If the signup has a price but no payment, it's pending
  return SignupPaymentStatus.PENDING;
}

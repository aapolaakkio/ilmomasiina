"use server";

import { ActionError, actionClient, verifyEditToken } from "@/auth/safe-action";
import { internalAuditLogger } from "@/auditlog";
import { signupWithToken } from "@/db/zod";
import { startPayment } from "@/services/payment/startPayment";

export const startPaymentAction = actionClient.inputSchema(signupWithToken).action(async ({ parsedInput }) => {
  verifyEditToken(parsedInput.signupId, parsedInput.editToken);
  const result = await startPayment(parsedInput.signupId, internalAuditLogger);
  if (!result.paymentUrl) {
    throw new ActionError("Payment could not be started");
  }
  return { paymentUrl: result.paymentUrl };
});

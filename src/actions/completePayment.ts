"use server";

import { actionClient, verifyEditToken } from "@/auth/safe-action";
import { internalAuditLogger } from "@/auditlog";
import { signupWithToken } from "@/db/zod";
import { completePayment } from "@/services/payment/completePayment";

export const completePaymentAction = actionClient.inputSchema(signupWithToken).action(async ({ parsedInput }) => {
  verifyEditToken(parsedInput.signupId, parsedInput.editToken);
  return completePayment(parsedInput.signupId, internalAuditLogger);
});

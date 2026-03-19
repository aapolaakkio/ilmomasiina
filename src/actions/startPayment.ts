"use server";

import { ActionError, actionClient } from "@/auth/safe-action";
import { signupWithToken } from "@/db/zod";
import { startPayment } from "@/services/payment/startPayment";

export const startPaymentAction = actionClient.inputSchema(signupWithToken).action(async ({ parsedInput }) => {
  const { verifyToken } = await import("@/services/signups/editTokens");
  if (!verifyToken(parsedInput.signupId, parsedInput.editToken)) {
    throw new ActionError("Invalid edit token");
  }
  const result = await startPayment(parsedInput.signupId);
  return { paymentUrl: result.paymentUrl };
});

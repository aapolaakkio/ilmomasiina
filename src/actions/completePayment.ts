"use server";

import { ActionError, actionClient } from "@/auth/safe-action";
import { signupWithToken } from "@/db/zod";
import { verifyToken } from "@/services/signups/editTokens";
import { completePayment } from "@/services/payment/completePayment";

export const completePaymentAction = actionClient.inputSchema(signupWithToken).action(async ({ parsedInput }) => {
  if (!verifyToken(parsedInput.signupId, parsedInput.editToken)) {
    throw new ActionError("Invalid edit token");
  }
  return completePayment(parsedInput.signupId);
});

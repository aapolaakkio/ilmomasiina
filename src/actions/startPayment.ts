"use server";

import { actionClient, verifyEditToken } from "@/auth/safe-action";
import { signupWithToken } from "@/db/zod";
import { startPayment } from "@/services/payment/startPayment";

export const startPaymentAction = actionClient.inputSchema(signupWithToken).action(async ({ parsedInput }) => {
  verifyEditToken(parsedInput.signupId, parsedInput.editToken);
  const result = await startPayment(parsedInput.signupId);
  return { paymentUrl: result.paymentUrl };
});

"use server";

import { z } from "zod/v4";

import { ActionError, actionClient } from "@/auth/safe-action";
import { signupID, editToken } from "@/models/schema/signup";
import { startPayment } from "@/services/payment/startPayment";

const schema = z.object({
  signupId: signupID,
  editToken,
});

export const startPaymentAction = actionClient.inputSchema(schema).action(async ({ parsedInput }) => {
  const { verifyToken } = await import("@/services/signups/editTokens");
  if (!verifyToken(parsedInput.signupId, parsedInput.editToken)) {
    throw new ActionError("Invalid edit token");
  }
  const result = await startPayment(parsedInput.signupId);
  return { paymentUrl: result.paymentUrl };
});

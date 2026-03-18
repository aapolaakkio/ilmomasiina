"use server";

import { z } from "zod/v4";

import { ActionError, actionClient } from "@/auth/safe-action";
import { signupID, editToken } from "@/db/schema";
import { completePayment } from "@/services/payment/completePayment";

const schema = z.object({
  signupId: signupID,
  editToken,
});

export const completePaymentAction = actionClient.inputSchema(schema).action(async ({ parsedInput }) => {
  const { verifyToken } = await import("@/services/signups/editTokens");
  if (!verifyToken(parsedInput.signupId, parsedInput.editToken)) {
    throw new ActionError("Invalid edit token");
  }
  return completePayment(parsedInput.signupId);
});

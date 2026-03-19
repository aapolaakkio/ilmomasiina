"use server";

import { ActionError, actionClient } from "@/auth/safe-action";
import { signupWithToken } from "@/db/zod";
import { internalAuditLogger } from "@/auditlog";
import { deleteSignup } from "@/services/signups/deleteSignup";

export const deleteSignupAction = actionClient.inputSchema(signupWithToken).action(async ({ parsedInput }) => {
  const { verifyToken } = await import("@/services/signups/editTokens");
  if (!verifyToken(parsedInput.signupId, parsedInput.editToken)) {
    throw new ActionError("Invalid edit token");
  }
  await deleteSignup(parsedInput.signupId, internalAuditLogger);
});

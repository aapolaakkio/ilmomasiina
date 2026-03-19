"use server";

import { actionClient, verifyEditToken } from "@/auth/safe-action";
import { signupWithToken } from "@/db/zod";
import { internalAuditLogger } from "@/auditlog";
import { deleteSignup } from "@/services/signups/deleteSignup";

export const deleteSignupAction = actionClient.inputSchema(signupWithToken).action(async ({ parsedInput }) => {
  verifyEditToken(parsedInput.signupId, parsedInput.editToken);
  await deleteSignup(parsedInput.signupId, internalAuditLogger);
});

"use server";

import { ActionError, actionClient } from "@/auth/safe-action";
import { signupUpdateBody, signupWithToken } from "@/db/zod";
import { internalAuditLogger } from "@/auditlog";
import { updateSignupAsUser } from "@/services/signups/updateSignup";

const schema = signupWithToken.extend({
  body: signupUpdateBody,
});

export const updateSignupAction = actionClient.inputSchema(schema).action(async ({ parsedInput }) => {
  const { verifyToken } = await import("@/services/signups/editTokens");
  if (!verifyToken(parsedInput.signupId, parsedInput.editToken)) {
    throw new ActionError("Invalid edit token");
  }
  return updateSignupAsUser(parsedInput.signupId, parsedInput.body, internalAuditLogger);
});

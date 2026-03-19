"use server";

import { actionClient, verifyEditToken } from "@/auth/safe-action";
import { signupUpdateBody, signupWithToken } from "@/db/zod";
import { internalAuditLogger } from "@/auditlog";
import { updateSignupAsUser } from "@/services/signups/updateSignup";

const schema = signupWithToken.extend({
  body: signupUpdateBody,
});

export const updateSignupAction = actionClient.inputSchema(schema).action(async ({ parsedInput }) => {
  verifyEditToken(parsedInput.signupId, parsedInput.editToken);
  return updateSignupAsUser(parsedInput.signupId, parsedInput.body, internalAuditLogger);
});

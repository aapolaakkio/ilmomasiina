"use server";

import { actionClient } from "@/auth/safe-action";
import { signupCreateBody } from "@/db/zod";
import { internalAuditLogger } from "@/auditlog";
import { createSignup } from "@/services/signups/createSignup";

export const createSignupAction = actionClient.inputSchema(signupCreateBody).action(async ({ parsedInput }) => {
  return createSignup(parsedInput, internalAuditLogger);
});

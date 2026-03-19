"use server";

import { requireEventAccessBySignup } from "@/auth/eventAccess";
import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { signupIdInput } from "@/db/zod";
import { deleteSignup } from "@/services/signups/deleteSignup";

export const deleteSignupAsAdminAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(signupIdInput)
  .action(async ({ parsedInput, ctx: { session, auditLogger } }) => {
    await requireEventAccessBySignup(session, parsedInput.signupId);
    await deleteSignup(parsedInput.signupId, auditLogger, true);
  });

"use server";

import { z } from "zod/v4";

import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { signupID } from "@/models/schema/signup";
import { deleteSignup } from "@/services/signups/deleteSignup";

const schema = z.object({
  signupId: signupID,
});

export const deleteSignupAsAdminAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { auditLogger } }) => {
    await deleteSignup(parsedInput.signupId, auditLogger, true);
  });

"use server";

import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { adminSignupCreateBody } from "@/models/schema/signup";
import { createSignupAsAdmin } from "@/services/signups/updateSignup";

export const createSignupAsAdminAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(adminSignupCreateBody)
  .action(async ({ parsedInput, ctx: { auditLogger } }) => {
    return createSignupAsAdmin(parsedInput, auditLogger, parsedInput.sendEmail ?? true);
  });

"use server";

import { requireEventAccessByQuota } from "@/auth/eventAccess";
import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { adminSignupCreateBody } from "@/models/schema/signup";
import { createSignupAsAdmin } from "@/services/signups/updateSignup";

export const createSignupAsAdminAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(adminSignupCreateBody)
  .action(async ({ parsedInput, ctx: { session, auditLogger } }) => {
    await requireEventAccessByQuota(session, parsedInput.quotaId);
    return createSignupAsAdmin(parsedInput, auditLogger, parsedInput.sendEmail ?? true);
  });

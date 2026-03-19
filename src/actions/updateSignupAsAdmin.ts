"use server";

import { requireEventAccessBySignup } from "@/auth/eventAccess";
import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { adminSignupUpdateBody, signupIdInput } from "@/db/zod";
import { updateSignupAsAdmin } from "@/services/signups/updateSignup";

const schema = signupIdInput.extend({
  body: adminSignupUpdateBody,
});

export const updateSignupAsAdminAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { session, auditLogger } }) => {
    await requireEventAccessBySignup(session, parsedInput.signupId);
    return updateSignupAsAdmin(parsedInput.signupId, parsedInput.body, auditLogger, parsedInput.body.sendEmail ?? true);
  });

"use server";

import { z } from "zod/v4";

import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { adminSignupUpdateBody, signupID } from "@/models/schema/signup";
import { updateSignupAsAdmin } from "@/services/signups/updateSignup";

const schema = z.object({
  signupId: signupID,
  body: adminSignupUpdateBody,
});

export const updateSignupAsAdminAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { auditLogger } }) => {
    return updateSignupAsAdmin(parsedInput.signupId, parsedInput.body, auditLogger, parsedInput.body.sendEmail ?? true);
  });

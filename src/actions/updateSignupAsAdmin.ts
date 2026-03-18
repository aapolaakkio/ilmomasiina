"use server";

import { z } from "zod/v4";

import { requireEventAccessBySignup } from "@/auth/eventAccess";
import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { signupID } from "@/db/schema";
import { adminSignupUpdateBody } from "@/db/zod";
import { updateSignupAsAdmin } from "@/services/signups/updateSignup";

const schema = z.object({
  signupId: signupID,
  body: adminSignupUpdateBody,
});

export const updateSignupAsAdminAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { session, auditLogger } }) => {
    await requireEventAccessBySignup(session, parsedInput.signupId);
    return updateSignupAsAdmin(parsedInput.signupId, parsedInput.body, auditLogger, parsedInput.body.sendEmail ?? true);
  });

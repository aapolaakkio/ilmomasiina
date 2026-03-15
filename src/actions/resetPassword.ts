"use server";

import { z } from "zod/v4";

import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { userID } from "@/models/schema/user";
import { resetPassword } from "@/services/admin/users/resetPassword";

const schema = z.object({
  userId: userID,
});

export const resetPasswordAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { auditLogger } }) => {
    await resetPassword(parsedInput.userId, auditLogger);
  });

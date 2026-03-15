"use server";

import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { userChangePasswordSchema } from "@/models/schema/user";
import { changePassword } from "@/services/admin/users/changePassword";

export const changePasswordAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(userChangePasswordSchema)
  .action(async ({ parsedInput, ctx: { session, auditLogger } }) => {
    await changePassword(session.user, parsedInput, auditLogger);
  });

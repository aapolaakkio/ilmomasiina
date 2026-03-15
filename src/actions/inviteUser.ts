"use server";

import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { userInviteSchema } from "@/models/schema/user";
import { inviteUser } from "@/services/admin/users/inviteUser";

export const inviteUserAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(userInviteSchema)
  .action(async ({ parsedInput, ctx: { auditLogger } }) => {
    return inviteUser(parsedInput.email, auditLogger);
  });

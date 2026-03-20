"use server";

import { actionClient, isAdminMiddleware, isAuthorizedMiddleware } from "@/auth/safe-action";
import { userIdInput } from "@/db/zod";
import { deleteUser } from "@/services/admin/users/deleteUser";

export const deleteUserAction = actionClient
  .use(isAuthorizedMiddleware)
  .use(isAdminMiddleware)
  .inputSchema(userIdInput)
  .action(async ({ parsedInput, ctx: { session, auditLogger } }) => {
    await deleteUser(parsedInput.userId, session.user, auditLogger);
  });

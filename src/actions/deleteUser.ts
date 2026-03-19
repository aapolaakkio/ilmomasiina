"use server";

import { z } from "zod";

import { actionClient, isAdminMiddleware, isAuthorizedMiddleware } from "@/auth/safe-action";
import { userID } from "@/db/schema";
import { deleteUser } from "@/services/admin/users/deleteUser";

const schema = z.object({
  userId: userID,
});

export const deleteUserAction = actionClient
  .use(isAuthorizedMiddleware)
  .use(isAdminMiddleware)
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { session, auditLogger } }) => {
    await deleteUser(parsedInput.userId, session.user, auditLogger);
  });

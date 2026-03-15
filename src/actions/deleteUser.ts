"use server";

import { z } from "zod/v4";

import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { userID } from "@/models/schema/user";
import { deleteUser } from "@/services/admin/users/deleteUser";

const schema = z.object({
  userId: userID,
});

export const deleteUserAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { session, auditLogger } }) => {
    await deleteUser(parsedInput.userId, session.user, auditLogger);
  });

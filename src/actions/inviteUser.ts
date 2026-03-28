"use server";

import { revalidateTag, updateTag } from "next/cache";

import { actionClient, isAdminMiddleware, isAuthorizedMiddleware } from "@/auth/safe-action";
import { userInviteSchema } from "@/db/zod";
import { inviteUser } from "@/services/admin/users/inviteUser";

export const inviteUserAction = actionClient
  .use(isAuthorizedMiddleware)
  .use(isAdminMiddleware)
  .inputSchema(userInviteSchema)
  .action(async ({ parsedInput, ctx: { auditLogger } }) => {
    const result = await inviteUser(parsedInput.email, parsedInput.role, auditLogger);
    updateTag("admin-users");
    revalidateTag("admin-audit-log", "max");
    return result;
  });

"use server";

import { env } from "@/env";
import { setAdminCookie } from "@/auth/jwt";
import { ActionError, actionClient } from "@/auth/safe-action";
import { userCreateSchema } from "@/models/schema/user";
import { internalAuditLogger } from "@/auditlog";
import AdminAuthSession from "@/auth/adminAuthSession";
import { createInitialUser } from "@/services/admin/users/createInitialUser";

export const createInitialUserAction = actionClient.inputSchema(userCreateSchema).action(async ({ parsedInput }) => {
  try {
    const result = await createInitialUser(
      parsedInput,
      internalAuditLogger,
      new AdminAuthSession(env.FEATHERS_AUTH_SECRET),
    );
    await setAdminCookie(result.accessToken);
  } catch (err) {
    throw new ActionError(err instanceof Error ? err.message : "User creation failed");
  }
});

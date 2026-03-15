"use server";

import { env } from "@/env";
import { setAdminCookie } from "@/auth/jwt";
import { ActionError, actionClient } from "@/auth/safe-action";
import { adminLoginBody } from "@/models/schema/login";
import AdminAuthSession from "@/auth/adminAuthSession";
import { adminLogin } from "@/auth/login";

export const loginAction = actionClient.inputSchema(adminLoginBody).action(async ({ parsedInput }) => {
  try {
    const result = await adminLogin(parsedInput, new AdminAuthSession(env.FEATHERS_AUTH_SECRET));
    await setAdminCookie(result.accessToken);
  } catch (err) {
    throw new ActionError(err instanceof Error ? err.message : "Login failed");
  }
});

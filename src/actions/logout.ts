"use server";

import { clearAdminCookie } from "@/auth/jwt";
import { actionClient } from "@/auth/safe-action";

export const logoutAction = actionClient.action(async () => {
  await clearAdminCookie();
});

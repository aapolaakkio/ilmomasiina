"use server";

import { env } from "@/env";
import { setAdminCookie, verifyAdminSession } from "@/auth/jwt";
import { ActionError, actionClient } from "@/auth/safe-action";
import AdminAuthSession from "@/auth/adminAuthSession";
import { renewAdminToken } from "@/auth/login";

export const renewTokenAction = actionClient.action(async () => {
  const session = await verifyAdminSession();
  if (!session) {
    throw new ActionError("Not authenticated");
  }

  try {
    const result = await renewAdminToken(session.user, new AdminAuthSession(env.FEATHERS_AUTH_SECRET));
    await setAdminCookie(result.accessToken);
  } catch (err) {
    throw new ActionError(err instanceof Error ? err.message : "Token renewal failed");
  }
});

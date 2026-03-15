import type { AdminLoginBody, AdminLoginResponse, UserID } from "@/models";

import AdminAuthSession from "./adminAuthSession";
import AdminPasswordAuth from "./adminPasswordAuth";
import { db } from "../db";

/** Authenticate an admin user and return an access token. */
export async function adminLogin(body: AdminLoginBody, adminSession: AdminAuthSession): Promise<AdminLoginResponse> {
  const user = await db.query.users.findFirst({
    where: { email: body.email },
    columns: { id: true, password: true, email: true },
  });

  // Verify password
  if (!user || !AdminPasswordAuth.verifyHash(body.password, user.password)) {
    // Mitigate user enumeration by timing: waste some time if we didn't actually verify a password
    if (!user) AdminPasswordAuth.createHash("hunter2");
    throw new Error("Invalid email or password");
  }

  const accessToken = adminSession.createSession(user);
  return { accessToken };
}

/** Renew an admin token. Verifies the user still exists. */
export async function renewAdminToken(userId: UserID, adminSession: AdminAuthSession): Promise<AdminLoginResponse> {
  const user = await db.query.users.findFirst({
    where: { id: userId },
    columns: { id: true, email: true },
  });

  if (!user) {
    throw new Error("User no longer exists");
  }

  const accessToken = adminSession.createSession(user);
  return { accessToken };
}

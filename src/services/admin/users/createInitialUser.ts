import type { AdminLoginResponse, UserCreateSchema } from "@/models";

import type { AuditLogger } from "../../../auditlog";
import AdminAuthSession from "../../../auth/adminAuthSession";
import AdminPasswordAuth from "../../../auth/adminPasswordAuth";
import { db } from "../../../db";
import { createUser, InitialSetupAlreadyDone, isInitialSetupDone } from "./helpers";

/** Create the initial admin user and return an access token. */
// eslint-disable-next-line import/prefer-default-export
export async function createInitialUser(
  body: UserCreateSchema,
  auditLogger: AuditLogger,
  adminSession: AdminAuthSession,
): Promise<AdminLoginResponse> {
  AdminPasswordAuth.validateNewPassword(body.password);

  const user = await db.transaction(async (tx) => {
    if (await isInitialSetupDone(tx)) {
      throw new InitialSetupAlreadyDone("The initial admin user has already been created.");
    }
    return createUser(body, auditLogger, tx);
  });

  const accessToken = adminSession.createSession(user);
  return { accessToken };
}

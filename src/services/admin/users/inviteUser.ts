import { env } from "@/env";
import type { UserID, UserSchema } from "@/models";

import type { AuditLogger } from "../../../auditlog";
import { db } from "../../../db";
import EmailService from "../../../mail";
import { createUser } from "./helpers";

/** Add a user's email to the admin allowlist and notify them. */
// eslint-disable-next-line import/prefer-default-export
export async function inviteUser(email: string, auditLogger: AuditLogger): Promise<UserSchema> {
  const user = await db.transaction(async (tx) => createUser({ email }, auditLogger, tx));

  await EmailService.sendNewUserMail(user.email, null, {
    email: user.email,
    loginUrl: `${env.BASE_URL}/login`,
  });

  return { id: user.id as UserID, email: user.email };
}

import { env } from "@/env";
import type { UserSchema } from "@/db/zod";

import type { AuditLogger } from "../../../auditlog";
import { db } from "../../../db";
import EmailService from "../../../mail";
import { createUser } from "./helpers";
import { UserRole } from "@/db/schema";

/** Add a user's email to the admin allowlist and notify them. */
export async function inviteUser(email: string, role: UserRole, auditLogger: AuditLogger): Promise<UserSchema> {
  const user = await db.transaction(async (tx) => createUser({ email, role }, auditLogger, tx));

  await EmailService.sendNewUserMail(user.email, null, {
    email: user.email,
    loginUrl: `${env.BASE_URL}/login`,
  });

  return user;
}

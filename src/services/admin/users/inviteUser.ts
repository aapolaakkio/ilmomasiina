import type { UserID, UserSchema } from "@/models";

import type { AuditLogger } from "../../../auditlog";
import { db } from "../../../db";
import EmailService from "../../../mail";
import generatePassword from "./generatePassword";
import { createUser } from "./helpers";

/** Invite a new user. */
// eslint-disable-next-line import/prefer-default-export
export async function inviteUser(email: string, auditLogger: AuditLogger): Promise<UserSchema> {
  const password = generatePassword();

  const user = await db.transaction(async (tx) => createUser({ email, password }, auditLogger, tx));

  await EmailService.sendNewUserMail(user.email, null, { email: user.email, password });

  return { id: user.id as UserID, email: user.email };
}

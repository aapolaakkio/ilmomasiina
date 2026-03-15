import { eq } from "drizzle-orm";

import type { UserID } from "@/models";
import { AuditEvent } from "@/models";

import type { AuditLogger } from "../../../auditlog";
import AdminPasswordAuth from "../../../auth/adminPasswordAuth";
import { db } from "../../../db";
import { users } from "../../../db/schema";
import EmailService from "../../../mail";
import generatePassword from "./generatePassword";

/** Reset a user's password. */
// eslint-disable-next-line import/prefer-default-export
export async function resetPassword(userId: UserID, auditLogger: AuditLogger): Promise<void> {
  await db.transaction(async (tx) => {
    const existing = await tx.query.users.findFirst({
      where: { id: userId },
      columns: { id: true, email: true },
    });
    if (!existing) throw new Error("User does not exist");

    const newPassword = generatePassword();
    await tx
      .update(users)
      .set({ password: AdminPasswordAuth.createHash(newPassword), updatedAt: new Date() })
      .where(eq(users.id, userId));
    await auditLogger(AuditEvent.RESET_PASSWORD, { extra: { id: existing.id, email: existing.email }, tx });
    await EmailService.sendResetPasswordMail(existing.email, null, { email: existing.email, password: newPassword });
  });
}

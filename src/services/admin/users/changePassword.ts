import { eq } from "drizzle-orm";

import type { UserChangePasswordSchema, UserID } from "@/models";
import { AuditEvent, ErrorCode } from "@/models";

import type { AuditLogger } from "../../../auditlog";
import AdminPasswordAuth from "../../../auth/adminPasswordAuth";
import { db } from "../../../db";
import { users } from "../../../db/schema";
import CustomError from "../../../util/customError";

class WrongOldPassword extends CustomError {
  constructor(message: string) {
    super(401, ErrorCode.WRONG_OLD_PASSWORD, message);
  }
}

/** Change the current user's password. */
// eslint-disable-next-line import/prefer-default-export
export async function changePassword(
  userId: UserID,
  body: UserChangePasswordSchema,
  auditLogger: AuditLogger,
): Promise<void> {
  AdminPasswordAuth.validateNewPassword(body.newPassword);

  await db.transaction(async (tx) => {
    const existing = await tx.query.users.findFirst({
      where: { id: userId },
      columns: { id: true, email: true, password: true },
    });
    if (!existing) throw new Error("User does not exist");
    if (!AdminPasswordAuth.verifyHash(body.oldPassword, existing.password))
      throw new WrongOldPassword("Incorrect password");

    await tx
      .update(users)
      .set({ password: AdminPasswordAuth.createHash(body.newPassword), updatedAt: new Date() })
      .where(eq(users.id, userId));
    await auditLogger(AuditEvent.CHANGE_PASSWORD, { extra: { id: existing.id, email: existing.email }, tx });
  });
}

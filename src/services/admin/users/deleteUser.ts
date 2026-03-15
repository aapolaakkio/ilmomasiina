import { eq } from "drizzle-orm";

import { AuditEvent, ErrorCode, type UserID } from "@/models";

import type { AuditLogger } from "../../../auditlog";
import { db } from "../../../db";
import { users } from "../../../db/schema";
import CustomError from "../../../util/customError";

class CannotDeleteSelf extends CustomError {
  constructor(message: string) {
    super(403, ErrorCode.CANNOT_DELETE_SELF, message);
  }
}

/** Delete an admin user by ID. */
// eslint-disable-next-line import/prefer-default-export
export async function deleteUser(userId: UserID, currentUserId: UserID, auditLogger: AuditLogger): Promise<void> {
  await db.transaction(async (tx) => {
    const existing = await tx.query.users.findFirst({
      where: { id: userId },
      columns: { id: true, email: true },
    });

    if (!existing) throw new Error("User does not exist");
    if (currentUserId === existing.id) throw new CannotDeleteSelf("You can't delete your own user");

    await tx.delete(users).where(eq(users.id, userId));
    await auditLogger(AuditEvent.DELETE_USER, { extra: { id: existing.id, email: existing.email }, tx });
  });
}

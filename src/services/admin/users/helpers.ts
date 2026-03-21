import { AuditEvent, ErrorCode, UserRole } from "@/db/schema";
import type { UserSchema } from "@/db/zod";

import type { AuditLogger } from "../../../auditlog";
import type { DrizzleDb } from "../../../db";
import { users } from "../../../db/schema";
import { errorClass } from "../../../util/customError";

export const InitialSetupNeeded = errorClass(418, ErrorCode.INITIAL_SETUP_NEEDED);
export const InitialSetupAlreadyDone = errorClass(409, ErrorCode.INITIAL_SETUP_ALREADY_DONE);

export async function isInitialSetupDone(db: DrizzleDb) {
  const result = await db.query.users.findFirst({
    columns: { id: true },
  });
  return result != null;
}

/** Add a user email to the allowlist. */
export async function createUser(
  params: { email: string; role?: UserRole },
  auditLogger: AuditLogger,
  tx: DrizzleDb,
): Promise<UserSchema> {
  const existing = await tx.query.users.findFirst({
    where: { email: params.email },
    columns: { id: true },
  });

  if (existing) throw new Error("User with given email already exists");

  const [user] = await tx
    .insert(users)
    .values({
      email: params.email,
      role: params.role ?? UserRole.USER,
    })
    .returning({ id: users.id, email: users.email, role: users.role });

  await auditLogger(AuditEvent.CREATE_USER, {
    extra: { id: user.id, email: user.email },
    tx,
  });

  return user;
}

/* eslint-disable max-classes-per-file */

import { AuditEvent, ErrorCode } from "@/models";

import type { AuditLogger } from "../../../auditlog";
import type { DrizzleDb } from "../../../db";
import { users } from "../../../db/schema";
import CustomError from "../../../util/customError";

export class InitialSetupNeeded extends CustomError {
  constructor(message: string) {
    super(418, ErrorCode.INITIAL_SETUP_NEEDED, message);
  }
}

export class InitialSetupAlreadyDone extends CustomError {
  constructor(message: string) {
    super(409, ErrorCode.INITIAL_SETUP_ALREADY_DONE, message);
  }
}

export async function isInitialSetupDone(db: DrizzleDb): Promise<boolean> {
  const result = await db.query.users.findFirst({
    columns: { id: true },
  });
  return result != null;
}

/** Add a user email to the allowlist. */
export async function createUser(
  params: { email: string; role?: "admin" | "user" },
  auditLogger: AuditLogger,
  tx: DrizzleDb,
): Promise<{ id: number; email: string; role: "admin" | "user" }> {
  const existing = await tx.query.users.findFirst({
    where: { email: params.email },
    columns: { id: true },
  });

  if (existing) throw new Error("User with given email already exists");

  const [user] = await tx
    .insert(users)
    .values({ email: params.email, ...(params.role ? { role: params.role } : {}) })
    .returning({ id: users.id, email: users.email, role: users.role });

  await auditLogger(AuditEvent.CREATE_USER, {
    extra: { id: user.id, email: user.email },
    tx,
  });

  return user;
}

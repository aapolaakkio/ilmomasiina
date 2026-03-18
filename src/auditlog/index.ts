import type { AuditEvent, EventID, SignupID } from "@/db/schema";

import { type DrizzleDb, db as globalDb } from "../db";
import { auditlogs } from "../db/schema";

interface AuditLogEvent {
  id: EventID;
  title: string;
}

interface AuditLogSignup {
  id: SignupID;
  firstName?: string | null;
  lastName?: string | null;
  quota?: {
    event?: AuditLogEvent;
  };
}

/**
 * Creates an {@link AuditLogger}
 *
 * @param ipAddress related ip address
 * @param user user email
 */
function eventLogger(ipAddress: string, user?: string) {
  return async (
    action: AuditEvent,
    {
      tx,
      event,
      signup,
      extra,
    }: {
      event?: AuditLogEvent;
      signup?: AuditLogSignup;
      tx?: DrizzleDb;
      extra?: object;
    },
  ) => {
    const db = tx ?? globalDb;
    const eventId = event?.id ?? signup?.quota?.event?.id ?? null;
    const row: typeof auditlogs.$inferInsert = {
      user,
      action,
      eventId,
      eventName: (eventId === event?.id ? event?.title : signup?.quota?.event?.title) ?? null,
      signupId: signup?.id ?? null,
      signupName: signup?.firstName != null ? `${signup.firstName} ${signup.lastName}` : null,
      extra: extra ? JSON.stringify(extra) : null,
      ipAddress,
    };
    await db.insert(auditlogs).values(row);
  };
}

/** Use to log internally triggered actions to the audit log */
export const internalAuditLogger = eventLogger("internal");

/** Creates an audit logger for a specific IP and optional user. */
export function createAuditLogger(ipAddress: string, user?: string) {
  return eventLogger(ipAddress, user);
}

export type AuditLogger = ReturnType<typeof eventLogger>;

import type { AuditEvent } from "@/models";

import { type DrizzleDb, db as globalDb } from "../db";
import { auditlogs } from "../db/schema";

interface AuditLogEvent {
  id: string;
  title: string;
}

interface AuditLogSignup {
  id: string;
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
 * @param user a function returning username (email), executed when events are logged
 */
function eventLogger(ipAddress: string, user?: () => string | null) {
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
    await db.insert(auditlogs).values({
      user: user ? user() : null,
      action,
      eventId: event?.id || signup?.quota?.event?.id || null,
      eventName: event?.title || signup?.quota?.event?.title || null,
      signupId: signup?.id || null,
      signupName: signup?.firstName != null ? `${signup.firstName} ${signup.lastName}` : null,
      extra: extra ? JSON.stringify(extra) : null,
      ipAddress,
    });
  };
}

/** Use to log internally triggered actions to the audit log */
export const internalAuditLogger = eventLogger("internal");

/** Creates an audit logger for a specific IP and optional user. */
export function createAuditLogger(ipAddress: string, user?: () => string | null) {
  return eventLogger(ipAddress, user);
}

export type AuditLogger = ReturnType<typeof eventLogger>;

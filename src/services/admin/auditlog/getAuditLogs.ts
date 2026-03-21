import type { SQL } from "drizzle-orm";
import { and, count, desc, eq, inArray, like, or } from "drizzle-orm";

import type { EventID, SignupID } from "@/db/schema";
import { AUDIT_LOG_DEFAULT_LIMIT, type AuditLogQuery } from "@/db/zod";

import { db } from "../../../db";
import { auditlogs } from "../../../db/schema";

const MAX_LOGS = 100;

/** Get audit log entries with optional filtering and pagination. */
export async function getAuditLogItems(query: AuditLogQuery) {
  const conditions: SQL[] = [];

  if (query.user) {
    conditions.push(like(auditlogs.user, `%${query.user}%`));
  }
  if (query.ip) {
    conditions.push(like(auditlogs.ipAddress, `%${query.ip}%`));
  }
  if (query.action) {
    conditions.push(inArray(auditlogs.action, query.action));
  }
  if (query.event) {
    conditions.push(or(eq(auditlogs.eventId, query.event as EventID), like(auditlogs.eventName, `%${query.event}%`))!);
  }
  if (query.signup) {
    conditions.push(
      or(eq(auditlogs.signupId, query.signup as SignupID), like(auditlogs.signupName, `%${query.signup}%`))!,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = Math.min(MAX_LOGS, query.limit ?? AUDIT_LOG_DEFAULT_LIMIT);
  const offset = query.offset ?? 0;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: auditlogs.id,
        createdAt: auditlogs.createdAt,
        action: auditlogs.action,
        user: auditlogs.user,
        ipAddress: auditlogs.ipAddress,
        eventId: auditlogs.eventId,
        eventName: auditlogs.eventName,
        signupId: auditlogs.signupId,
        signupName: auditlogs.signupName,
        extra: auditlogs.extra,
      })
      .from(auditlogs)
      .where(whereClause)
      .orderBy(desc(auditlogs.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(auditlogs).where(whereClause),
  ]);

  return {
    rows,
    count: total,
  };
}

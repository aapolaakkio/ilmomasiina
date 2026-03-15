import type { SQL } from "drizzle-orm";
import { and, count, desc, eq, inArray, like, or } from "drizzle-orm";

import type { AuditLogResponse, AuditLoqQuery } from "@/models";
import { AUDIT_LOG_DEFAULT_LIMIT } from "@/models";

import { db } from "../../../db";
import { auditlogs } from "../../../db/schema";

const MAX_LOGS = 100;

/** Get audit log entries with optional filtering and pagination. */
// eslint-disable-next-line import/prefer-default-export
export async function getAuditLogItems(query: AuditLoqQuery): Promise<AuditLogResponse> {
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
    conditions.push(or(eq(auditlogs.eventId, query.event), like(auditlogs.eventName, `%${query.event}%`))!);
  }
  if (query.signup) {
    conditions.push(or(eq(auditlogs.signupId, query.signup), like(auditlogs.signupName, `%${query.signup}%`))!);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = Math.min(MAX_LOGS, query.limit ?? AUDIT_LOG_DEFAULT_LIMIT);
  const offset = query.offset ?? 0;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(auditlogs).where(whereClause).orderBy(desc(auditlogs.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(auditlogs).where(whereClause),
  ]);

  return {
    rows: rows as unknown as AuditLogResponse["rows"],
    count: total,
  };
}

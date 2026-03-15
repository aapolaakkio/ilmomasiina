import { z } from "zod/v4";

import { AuditEvent } from "../../enum";

/** Default limit for audit log queries. */
export const AUDIT_LOG_DEFAULT_LIMIT = 100;

/** Schema for an audit log item. */
const auditLogItemSchema = z.object({
  id: z.int(),
  user: z.nullable(z.string()),
  ipAddress: z.string(),
  action: z.enum(AuditEvent),
  eventId: z.nullable(z.string()),
  eventName: z.nullable(z.string()),
  signupId: z.nullable(z.string()),
  signupName: z.nullable(z.string()),
  extra: z.nullable(z.string()),
  createdAt: z.string(),
});

/** Query parameters applicable to the audit log API. */
export const auditLoqQuery = z.object({
  user: z.string().optional(),
  ip: z.string().optional(),
  action: z.array(z.enum(AuditEvent)).optional(),
  event: z.string().optional(),
  signup: z.string().optional(),
  limit: z.int().min(0).optional(),
  offset: z.int().min(0).optional(),
});

/** Response schema for fetching audit logs. */
export const auditLogResponse = z.object({
  rows: z.array(auditLogItemSchema),
  count: z.int(),
});

/** Query parameters applicable to the audit log API. */
export type AuditLoqQuery = z.infer<typeof auditLoqQuery>;
/** Schema for an audit log event. */
export type AuditLogItemSchema = z.infer<typeof auditLogItemSchema>;
/** Response schema for fetching a audit logs. */
export type AuditLogResponse = z.infer<typeof auditLogResponse>;

import { auditLogQuery, type AuditLogQuery } from "@/db/zod";

import { firstSearchParam } from "@/lib/nextSearchParams";

export const AUDIT_LOG_PAGE_SIZE = 100;

function firstParam(raw: Record<string, string | string[] | undefined>, key: string) {
  return firstSearchParam(raw[key]);
}

/** Build {@link AuditLogQuery} from URL search params (GET form / pagination links). */
export function parseAuditLogSearchParams(raw: Record<string, string | string[] | undefined>) {
  const offsetRaw = firstParam(raw, "offset");
  const offsetParsed = offsetRaw !== undefined ? Number.parseInt(offsetRaw, 10) : 0;
  const actionVal = firstParam(raw, "action");

  const candidate: Record<string, unknown> = {
    user: firstParam(raw, "user"),
    ip: firstParam(raw, "ip"),
    event: firstParam(raw, "event"),
    signup: firstParam(raw, "signup"),
    action: actionVal ? [actionVal] : undefined,
    limit: AUDIT_LOG_PAGE_SIZE,
    offset: Number.isFinite(offsetParsed) && offsetParsed >= 0 ? offsetParsed : 0,
  };

  const parsed = auditLogQuery.safeParse(candidate);
  return parsed.success ? parsed.data : { limit: AUDIT_LOG_PAGE_SIZE, offset: 0 };
}

/** Serialize query for pagination / filter links (omit defaults). */
export function auditLogQueryToSearchParams(query: AuditLogQuery) {
  const p = new URLSearchParams();
  if (query.user) p.set("user", query.user);
  if (query.ip) p.set("ip", query.ip);
  if (query.event) p.set("event", query.event);
  if (query.signup) p.set("signup", query.signup);
  if (query.action?.length) p.set("action", query.action[0]!);
  if (query.offset && query.offset > 0) p.set("offset", String(query.offset));
  return p;
}

export function auditLogSearchSuffix(query: AuditLogQuery) {
  const s = auditLogQueryToSearchParams(query).toString();
  return s ? `?${s}` : "";
}

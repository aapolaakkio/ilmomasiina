import { cacheLife, cacheTag } from "next/cache";

import type { AuditLogQuery } from "@/db/zod";
import { getAuditLogItems } from "@/services/admin/auditlog/getAuditLogs";

export async function getCachedAuditLog(query: AuditLogQuery) {
  "use cache";
  cacheLife("max");
  cacheTag("admin-audit-log");
  return getAuditLogItems(query);
}

import { lt } from "drizzle-orm";

import { env } from "@/env";
import { db } from "../db";
import { auditlogs } from "../db/schema";

export default async function deleteOldAuditLogs() {
  const cutoff = new Date(Date.now() - env.ANONYMIZE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  await db.delete(auditlogs).where(lt(auditlogs.createdAt, cutoff));
}

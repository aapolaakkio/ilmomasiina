import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import AuditLogView from "@/components/admin/AuditLog";
import { requireAdmin } from "@/auth/adminAuth";
import { parseAuditLogSearchParams } from "@/lib/auditLogUrl";
import { getCachedAuditLog } from "@/cache/admin/auditlog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auditLog");
  return { title: t("title") };
}

export default async function AuditLogPage({ searchParams }: PageProps<"/[locale]/admin/auditlog">) {
  const session = await requireAdmin();
  if (session.role !== "admin") notFound();

  const raw = await searchParams;
  const query = parseAuditLogSearchParams(raw);
  const logs = await getCachedAuditLog(query);

  return <AuditLogView query={query} logs={logs} />;
}

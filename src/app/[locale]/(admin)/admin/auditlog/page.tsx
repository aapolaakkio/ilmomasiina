import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import AuditLogClient from "@/components/admin/AuditLog";
import { requireAdmin } from "@/auth/adminAuth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auditLog");
  return { title: t("title") };
}

export default async function AuditLogPage() {
  const session = await requireAdmin();
  if (session.role !== "admin") notFound();

  return <AuditLogClient />;
}

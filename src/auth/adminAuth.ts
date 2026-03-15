import { headers } from "next/headers";
import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import type { AuditLogger } from "@/auditlog";
import { createAuditLogger } from "@/auditlog";

import type { AdminTokenData } from "./jwt";
import { verifyAdminSession } from "./jwt";

/** Require admin authentication. Redirects to /login if not authenticated. */
export async function requireAdmin(): Promise<AdminTokenData> {
  const session = await verifyAdminSession();
  if (!session) {
    const locale = await getLocale();
    redirect({ href: "/login", locale });
    throw new Error("Redirect failed");
  }
  return session;
}

/** Create an audit logger for the current admin request. */
export async function createAdminAuditLogger(session: AdminTokenData): Promise<AuditLogger> {
  const headerStore = await headers();
  const ipAddress = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createAuditLogger(ipAddress, () => session.email || null);
}

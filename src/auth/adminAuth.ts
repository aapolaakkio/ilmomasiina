import { headers } from "next/headers";
import { getLocale } from "next-intl/server";

import { getAdminSession } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { createAuditLogger } from "@/auditlog";
import type { UserID } from "@/db/schema";

export interface AdminTokenData {
  user: UserID;
  email: string;
  role: "admin" | "user";
}

/** Require admin authentication. Redirects to /login if not authenticated. */
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) {
    const locale = await getLocale();
    redirect({ href: "/login", locale });
    throw new Error("Redirect failed");
  }
  return session;
}

/** Create an audit logger for the current admin request. */
export async function createAdminAuditLogger(session: AdminTokenData) {
  const headerStore = await headers();
  const ipAddress = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createAuditLogger(ipAddress, session.email);
}

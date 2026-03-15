import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import AdminUsersClient from "@/components/admin/AdminUsers";
import { requireAdmin } from "@/auth/adminAuth";
import { listUsers } from "@/services/admin/users/listUsers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminUsers");
  return { title: t("title") };
}

export default async function AdminUsersPage() {
  await requireAdmin();

  const users = await listUsers();

  return <AdminUsersClient users={users} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import AdminUsersClient from "@/components/admin/AdminUsers";
import { requireAdmin } from "@/auth/adminAuth";
import { getCachedAdminUsers } from "@/cache/admin/users";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminUsers");
  return { title: t("title") };
}

export default async function AdminUsersPage(_props: PageProps<"/[locale]/admin/users">) {
  const session = await requireAdmin();
  if (session.role !== "admin") notFound();

  const users = await getCachedAdminUsers();

  return <AdminUsersClient users={users} />;
}

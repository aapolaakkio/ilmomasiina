import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import AdminUsersClient from "@/components/admin/AdminUsers";
import { requireAdmin } from "@/auth/adminAuth";
import { listUsers } from "@/services/admin/users/listUsers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminUsers");
  return { title: t("title") };
}

export default async function AdminUsersPage() {
  const session = await requireAdmin();
  if (session.role !== "admin") notFound();

  const users = await listUsers();

  return <AdminUsersClient users={users} />;
}

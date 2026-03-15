import AdminUsersClient from "@/components/admin/AdminUsers";
import { requireAdmin } from "@/auth/adminAuth";
import { listUsers } from "@/services/admin/users/listUsers";

export default async function AdminUsersPage() {
  await requireAdmin();

  const users = await listUsers();

  return <AdminUsersClient users={users} />;
}

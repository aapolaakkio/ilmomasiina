import AuditLogClient from "@/components/admin/AuditLog";
import { requireAdmin } from "@/auth/adminAuth";

export default async function AuditLogPage() {
  await requireAdmin();

  return <AuditLogClient />;
}

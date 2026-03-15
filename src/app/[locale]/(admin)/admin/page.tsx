import AdminEventsClient from "@/components/admin/AdminEventsList";
import { requireAdmin } from "@/auth/adminAuth";
import { getEventsListForAdmin } from "@/services/events/getEventsList";

export default async function AdminEventsListPage() {
  await requireAdmin();

  const events = await getEventsListForAdmin({});

  return <AdminEventsClient events={events} />;
}

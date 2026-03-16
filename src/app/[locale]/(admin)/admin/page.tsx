import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import AdminEventsClient from "@/components/admin/AdminEventsList";
import { requireAdmin } from "@/auth/adminAuth";
import { getEventsListForAdmin } from "@/services/events/getEventsList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminEvents");
  return { title: t("title") };
}

export default async function AdminEventsListPage() {
  const session = await requireAdmin();
  const isAdmin = session.role === "admin";

  const { events, editorsByEvent } = await getEventsListForAdmin({}, { includeEditors: !isAdmin });

  // For non-admin users, derive editable event IDs from the editors relation
  let editableEventIds: string[] | null = null;
  if (!isAdmin && editorsByEvent) {
    editableEventIds = [];
    for (const [eventId, userIds] of editorsByEvent) {
      if (userIds.includes(session.user)) {
        editableEventIds.push(eventId);
      }
    }
  }

  return <AdminEventsClient events={events} role={session.role} editableEventIds={editableEventIds} />;
}

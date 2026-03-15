import { notFound } from "next/navigation";

import EventEditor from "@/components/admin/EventEditor";
import { requireAdmin } from "@/auth/adminAuth";
import type { EventID } from "@/models";
import { getCategories } from "@/services/events/getCategories";
import { getEventByIdForAdmin } from "@/services/events/getEventDetails";

export default async function CopyEventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();

  const { id } = await params;

  try {
    const [event, categories] = await Promise.all([getEventByIdForAdmin(id as EventID), getCategories()]);
    return <EventEditor event={event} isNew copy categories={categories} />;
  } catch {
    notFound();
  }
}

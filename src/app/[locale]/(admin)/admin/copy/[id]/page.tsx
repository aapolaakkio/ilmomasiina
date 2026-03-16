import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import EventEditor from "@/components/admin/EventEditor";
import { requireAdmin } from "@/auth/adminAuth";
import { requireEventAccess } from "@/auth/eventAccess";
import type { EventID } from "@/models";
import { getCategories } from "@/services/events/getCategories";
import { getEventByIdForAdmin } from "@/services/events/getEventDetails";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("editor");
  return { title: t("titleNew") };
}

export default async function CopyEventPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();

  const { id } = await params;

  try {
    await requireEventAccess(session, id as EventID);
    const [event, categories] = await Promise.all([getEventByIdForAdmin(id as EventID), getCategories()]);
    return <EventEditor event={event} isNew copy categories={categories} editors={[]} />;
  } catch {
    notFound();
  }
}

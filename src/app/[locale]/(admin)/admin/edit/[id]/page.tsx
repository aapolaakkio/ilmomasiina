import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import EventEditor from "@/components/admin/EventEditor";
import { requireAdmin } from "@/auth/adminAuth";
import { getLocalizedEvent } from "@/lib/localizedEvent";
import type { EventID } from "@/models";
import { getCategories } from "@/services/events/getCategories";
import { getEventByIdForAdmin } from "@/services/events/getEventDetails";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations("editor");
  if (id === "new") return { title: t("titleNew") };
  const locale = await getLocale();
  try {
    const event = await getEventByIdForAdmin(id as EventID);
    const localized = getLocalizedEvent(event, locale);
    return { title: `${t("titleEdit")} – ${localized.title}` };
  } catch {
    return {};
  }
}

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();

  const { id } = await params;

  // "new" means create a new event
  if (id === "new") {
    const categories = await getCategories();
    return <EventEditor event={null} isNew categories={categories} />;
  }

  try {
    const [event, categories] = await Promise.all([getEventByIdForAdmin(id as EventID), getCategories()]);
    return <EventEditor event={event} isNew={false} categories={categories} />;
  } catch {
    notFound();
  }
}

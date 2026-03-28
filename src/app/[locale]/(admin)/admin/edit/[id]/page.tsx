import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import EventEditor from "@/components/admin/EventEditor";
import { requireAdmin } from "@/auth/adminAuth";
import { getLocalizedEvent } from "@/lib/localizedEvent";
import type { EventID } from "@/db/schema";
import { getCachedCategories } from "@/cache/categories";
import { getCachedAdminEvent, getCachedAdminEventForViewer } from "@/cache/admin/events";
import { getEventEditors } from "@/services/admin/events/eventEditors";
import { hasEventAccess } from "@/auth/eventAccess";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/edit/[id]">): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations("editor");
  if (id === "new") return { title: t("titleNew") };
  const locale = await getLocale();
  try {
    const event = await getCachedAdminEvent(id as EventID);
    const localized = getLocalizedEvent(event, locale);
    return { title: `${t("titleEdit")} – ${localized.title}` };
  } catch {
    return {};
  }
}

export default async function EditEventPage({ params }: Pick<PageProps<"/[locale]/admin/edit/[id]">, "params">) {
  const session = await requireAdmin();

  const { id } = await params;

  // "new" means create a new event
  if (id === "new") {
    const categories = await getCachedCategories();
    return <EventEditor event={null} isNew categories={categories} editors={[]} />;
  }

  const eventId = id as EventID;

  try {
    const canEdit = await hasEventAccess(session, eventId);
    const [event, categories, editors] = await Promise.all([
      canEdit ? getCachedAdminEvent(eventId) : getCachedAdminEventForViewer(eventId),
      getCachedCategories(),
      getEventEditors(eventId),
    ]);
    return <EventEditor event={event} isNew={false} categories={categories} editors={editors} readOnly={!canEdit} />;
  } catch {
    notFound();
  }
}

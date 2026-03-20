import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import AdminEventsList from "@/components/admin/AdminEventsList";
import { requireAdmin } from "@/auth/adminAuth";
import { isEventInPast } from "@/lib/adminEventsList";
import { firstSearchParam } from "@/lib/nextSearchParams";
import { getEventsListForAdmin } from "@/services/events/getEventsList";

export async function generateMetadata({ searchParams }: PageProps<"/[locale]/admin">): Promise<Metadata> {
  const t = await getTranslations("adminEvents");
  const { past } = await searchParams;
  const firstPast = firstSearchParam(past);
  const showPast = firstPast === "1" || firstPast === "true";
  return { title: showPast ? t("titlePast") : t("title") };
}

export default async function AdminEventsListPage({ searchParams }: PageProps<"/[locale]/admin">) {
  const { past } = await searchParams;
  const firstPast = firstSearchParam(past);
  const session = await requireAdmin();
  const showPast = firstPast === "1" || firstPast === "true";

  const events = await getEventsListForAdmin();
  const filtered = events.filter((e) => isEventInPast(e) === showPast);
  const filteredEvents = showPast ? [...filtered].reverse() : filtered;

  return <AdminEventsList events={filteredEvents} showPast={showPast} role={session.role} userId={session.user} />;
}

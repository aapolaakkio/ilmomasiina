import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import AdminEventsList from "@/components/admin/AdminEventsList";
import { requireAdmin } from "@/auth/adminAuth";
import { isEventInPast } from "@/lib/adminEventsList";
import { getEventsListForAdmin } from "@/services/events/getEventsList";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ past?: string }>;
}): Promise<Metadata> {
  const t = await getTranslations("adminEvents");
  const { past } = await searchParams;
  const showPast = past === "1" || past === "true";
  return { title: showPast ? t("titlePast") : t("title") };
}

export default async function AdminEventsListPage({ searchParams }: { searchParams: Promise<{ past?: string }> }) {
  const session = await requireAdmin();
  const { past } = await searchParams;
  const showPast = past === "1" || past === "true";

  const events = await getEventsListForAdmin();
  const filtered = events.filter((e) => isEventInPast(e) === showPast);
  const filteredEvents = showPast ? [...filtered].reverse() : filtered;

  return <AdminEventsList events={filteredEvents} showPast={showPast} role={session.role} userId={session.user} />;
}

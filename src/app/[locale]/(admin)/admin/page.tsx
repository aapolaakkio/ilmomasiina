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
  await requireAdmin();

  const events = await getEventsListForAdmin({});

  return <AdminEventsClient events={events} />;
}

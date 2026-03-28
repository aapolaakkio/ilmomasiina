import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import EventEditor from "@/components/admin/EventEditor";
import { requireAdmin } from "@/auth/adminAuth";
import type { EventID } from "@/db/schema";
import { getCachedCategories } from "@/cache/categories";
import { getCachedAdminEvent } from "@/cache/admin/events";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("editor");
  return { title: t("titleNew") };
}

export default async function CopyEventPage({ params }: PageProps<"/[locale]/admin/copy/[id]">) {
  await requireAdmin();

  const { id } = await params;

  try {
    const [event, categories] = await Promise.all([getCachedAdminEvent(id as EventID), getCachedCategories()]);
    return <EventEditor event={event} isNew copy categories={categories} editors={[]} />;
  } catch {
    notFound();
  }
}

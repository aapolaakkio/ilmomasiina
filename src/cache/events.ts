import { cacheLife, cacheTag } from "next/cache";

import type { EventListQuery } from "@/db/zod";
import { getEventBySlug as getEventBySlugService } from "@/services/events/getEventDetails";
import { getEventsListForUser } from "@/services/events/getEventsList";

export async function getCachedEventList(query: EventListQuery, initialSetupDone?: boolean) {
  "use cache";
  cacheLife("max");
  cacheTag("event-list");
  return getEventsListForUser(query, initialSetupDone);
}

export async function getCachedEventBySlug(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag("event-list");

  const event = await getEventBySlugService(slug);

  cacheTag(`event:${event.id}`);
  cacheTag(`event-signups:${event.id}`);

  return event;
}

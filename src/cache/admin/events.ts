import { cacheLife, cacheTag } from "next/cache";

import type { EventID } from "@/db/schema";
import { getEventByIdForAdmin, getEventByIdForViewer } from "@/services/events/getEventDetails";
import { getEventsListForAdmin } from "@/services/events/getEventsList";

export async function getCachedAdminEventList() {
  "use cache";
  cacheLife("max");
  cacheTag("admin-event-list");
  return getEventsListForAdmin();
}

export async function getCachedAdminEvent(eventId: EventID) {
  "use cache";
  cacheLife("max");
  cacheTag(`admin-event:${eventId}`);
  return getEventByIdForAdmin(eventId);
}

export async function getCachedAdminEventForViewer(eventId: EventID) {
  "use cache";
  cacheLife("max");
  cacheTag(`admin-event:${eventId}`);
  return getEventByIdForViewer(eventId);
}

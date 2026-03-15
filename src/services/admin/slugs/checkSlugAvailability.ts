import type { CheckSlugResponse, EventID, EventSlug } from "@/models";

import { db } from "../../../db";

/** Check if a slug is already in use and return the event using it. */
// eslint-disable-next-line import/prefer-default-export
export async function checkSlugAvailability(slug: EventSlug): Promise<CheckSlugResponse> {
  const event = await db.query.events.findFirst({
    where: { slug },
    columns: { id: true, title: true },
  });

  if (!event) {
    return { id: null, title: null };
  }

  return {
    id: event.id as EventID,
    title: event.title,
  };
}

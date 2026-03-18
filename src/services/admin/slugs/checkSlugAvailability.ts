import type { CheckSlugResponse, EventSlug } from "@/db/zod";

import { db } from "../../../db";

/** Check if a slug is already in use and return the event using it. */
export async function checkSlugAvailability(slug: EventSlug): Promise<CheckSlugResponse> {
  const event = await db.query.events.findFirst({
    where: { slug },
    columns: { id: true, title: true },
  });
  return event ?? { id: null, title: null };
}

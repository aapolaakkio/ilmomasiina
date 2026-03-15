import { z } from "zod/v4";

import { eventID, eventSlug } from "../event";

/** Path parameters necessary to check a slug's availability from the admin API. */
export const checkSlugParams = z.object({
  slug: eventSlug,
});

/** Response schema for checking a slug's availability. */
export const checkSlugResponse = z.object({
  id: z.nullable(eventID),
  title: z.nullable(z.string()),
});

/** Path parameters necessary to check a slug's availability from the admin API. */
export type CheckSlugParams = z.infer<typeof checkSlugParams>;
/** Response schema for checking a slug's availability. */
export type CheckSlugResponse = z.infer<typeof checkSlugResponse>;

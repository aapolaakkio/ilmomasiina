import { z } from "zod/v4";

/** Type of an event category. */
export const eventCategory = z.string();

/** Response schema for fetching event categories. */
export const categoriesResponse = z.array(eventCategory);

/** Type of an event category. */
export type EventCategory = z.infer<typeof eventCategory>;
/** Response schema for fetching event categories. */
export type CategoriesResponse = z.infer<typeof categoriesResponse>;

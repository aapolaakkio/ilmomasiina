import { isNull } from "drizzle-orm";

import type { CategoriesResponse } from "@/models";

import { db } from "../../db";
import { events } from "../../db/schema";

/** Get all distinct event categories. */
// eslint-disable-next-line import/prefer-default-export
export async function getCategories(): Promise<CategoriesResponse> {
  const results = await db.selectDistinct({ category: events.category }).from(events).where(isNull(events.deletedAt));

  return results.map((row) => row.category);
}

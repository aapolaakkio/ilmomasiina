import { isNull } from "drizzle-orm";

import type { CategoriesResponse } from "@/db/zod";

import { db } from "../../db";
import { events } from "../../db/schema";

/** Get all distinct event categories. */
export async function getCategories(): Promise<CategoriesResponse> {
  const results = await db.selectDistinct({ category: events.category }).from(events).where(isNull(events.deletedAt));

  return results.map((row) => row.category);
}

import { cacheLife, cacheTag } from "next/cache";

import { getCategories } from "@/services/events/getCategories";

export async function getCachedCategories() {
  "use cache";
  cacheLife("max");
  cacheTag("categories");
  return getCategories();
}

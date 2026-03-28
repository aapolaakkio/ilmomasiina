import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";

export async function getCachedIcalEvents() {
  "use cache";
  cacheLife("max");
  cacheTag("ical-feed");

  return db.query.events.findMany({
    columns: {
      id: true,
      title: true,
      description: true,
      location: true,
      category: true,
      slug: true,
      date: true,
      endDate: true,
    },
    where: {
      deletedAt: { isNull: true },
      draft: false,
      listed: true,
      date: { isNotNull: true },
      endDate: { isNotNull: true },
    },
    orderBy: { date: "asc" },
  });
}

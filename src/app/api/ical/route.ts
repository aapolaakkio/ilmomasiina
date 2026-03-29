import { createEvents } from "ics";
import type { NextRequest } from "next/server";

import { db } from "@/db";
import { createIcalEventAttrs } from "@/util/ical";

export async function GET(_request: NextRequest, _context: RouteContext<"/api/ical">) {
  const eventRows = await db.query.events.findMany({
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

  if (eventRows.length === 0) {
    const { value } = createEvents([]);
    return new Response(value, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": "attachment; filename=events.ics",
      },
    });
  }

  const icalAttrs = eventRows.map(createIcalEventAttrs).filter((attrs) => attrs !== undefined);
  const { error, value } = createEvents(icalAttrs);

  if (error) {
    return new Response("Failed to generate iCalendar", { status: 500 });
  }

  return new Response(value, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=events.ics",
    },
  });
}

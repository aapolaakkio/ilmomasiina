import { type DateArray, createEvents } from "ics";
import type { NextRequest } from "next/server";

import { env } from "@/env";
import { db } from "@/db";

function dateToArray(date: Date): DateArray {
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes()];
}

export async function GET(_request: NextRequest, _context: RouteContext<"/api/ical">) {
  const uidDomain = env.ICAL_UID_DOMAIN ?? new URL(env.BASE_URL).hostname;

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

  const { error, value } = createEvents(
    eventRows.map((event) => ({
      calName: env.BRANDING_ICAL_CALENDAR_NAME,
      uid: `${event.id}@${uidDomain}`,
      start: dateToArray(event.date!),
      startInputType: "utc" as const,
      end: dateToArray(event.endDate!),
      endInputType: "utc" as const,
      title: event.title,
      description: event.description ?? undefined,
      location: event.location ?? undefined,
      categories: event.category ? [event.category] : undefined,
      url: `${env.BASE_URL}/event/${event.slug}`,
    })),
  );

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

import type { DateArray, EventAttributes } from "ics";
import { remark } from "remark";
import stripMarkdown from "strip-markdown";

import { env } from "@/env";

type DateArray5 = [number, number, number, number, number];

function dateToArray(date: Date): DateArray5 {
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes()];
}

interface IcalEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  category: string | null;
  slug: string;
  date: Date | null;
  endDate: Date | null;
}

/** Creates iCal event attributes from an event, or undefined if dates are missing. */
export function createIcalEventAttrs(event: IcalEvent): EventAttributes | undefined {
  if (!event.date || !event.endDate) return undefined;

  const uidDomain = env.ICAL_UID_DOMAIN ?? new URL(env.BASE_URL).hostname;

  const description = remark()
    .use(stripMarkdown)
    .processSync(event.description ?? "")
    .toString()
    .trim();

  return {
    calName: env.BRANDING_ICAL_CALENDAR_NAME,
    uid: `${event.id}@${uidDomain}`,
    start: dateToArray(event.date) as DateArray,
    startInputType: "utc" as const,
    end: dateToArray(event.endDate) as DateArray,
    endInputType: "utc" as const,
    title: event.title,
    description: description || undefined,
    location: event.location ?? undefined,
    categories: event.category ? [event.category] : undefined,
    url: `${env.BASE_URL}/event/${event.slug}`,
  };
}

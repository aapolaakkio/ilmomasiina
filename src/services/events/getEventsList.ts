import { and, count, gt, inArray, isNotNull, isNull, or } from "drizzle-orm";

import type { QuotaID } from "@/db/schema";
import type { EventListQuery, UserEventListResponse } from "@/db/zod";

import { db } from "../../db";
import { activeSignupCutoff } from "../../db/filters";
import { reconstructEventLanguages } from "../../db/helpers";
import { signups } from "../../db/schema";
import { InitialSetupNeeded, isInitialSetupDone } from "../admin/users/helpers";

const DEFAULT_MAX_AGE_DAYS = 7;

/** Fetch signup counts per quota for the given quota IDs in a single aggregation query. */
async function fetchSignupCounts(quotaIds: QuotaID[]) {
  if (quotaIds.length === 0) return new Map();
  const rows = await db
    .select({ quotaId: signups.quotaId, count: count() })
    .from(signups)
    .where(
      and(
        inArray(signups.quotaId, quotaIds),
        isNull(signups.deletedAt),
        or(isNotNull(signups.confirmedAt), gt(signups.createdAt, activeSignupCutoff())),
      ),
    )
    .groupBy(signups.quotaId);
  return new Map(rows.map((r) => [r.quotaId, Number(r.count)]));
}

/** Sort events by date, then registration end date, then title. */
function sortEvents<
  T extends {
    date: Date | null;
    registrationEndDate?: Date | null;
    title: string;
  },
>(events: T[]): T[] {
  return events.sort((a, b) => {
    if (a.date === null && b.date !== null) return -1;
    if (a.date !== null && b.date === null) return 1;
    if (a.date && b.date) {
      const diff = a.date.getTime() - b.date.getTime();
      if (diff !== 0) return diff;
    }
    const aReg = a.registrationEndDate?.getTime() ?? 0;
    const bReg = b.registrationEndDate?.getTime() ?? 0;
    if (aReg !== bReg) return aReg - bReg;
    return a.title.localeCompare(b.title);
  });
}

/** Shared column selection for event list queries (excludes timestamp metadata). */
const eventListColumns = {
  id: true,
  slug: true,
  title: true,
  description: true,
  price: true,
  location: true,
  webpageUrl: true,
  verificationEmail: true,
  date: true,
  endDate: true,
  registrationStartDate: true,
  registrationEndDate: true,
  openQuotaSize: true,
  category: true,
  draft: true,
  listed: true,
  signupsPublic: true,
  nameQuestion: true,
  emailQuestion: true,
  payments: true,
  defaultLanguage: true,
} as const;

/** Shared relational include for event list queries. */
const eventListWith = {
  languages: true,
  quotas: {
    where: { deletedAt: { isNull: true } },
    orderBy: { order: "asc" as const },
    columns: { id: true, title: true, size: true, price: true },
    with: { languages: true },
  },
  questions: {
    where: { deletedAt: { isNull: true } },
    columns: { id: true, question: true, options: true },
    with: { languages: true },
  },
} as const;

/** Get the public events list. */
export async function getEventsListForUser(
  query: EventListQuery,
  initialSetupDone?: boolean,
): Promise<UserEventListResponse> {
  if (initialSetupDone === false && !(await isInitialSetupDone(db))) {
    throw new InitialSetupNeeded("Initial setup of Ilmomasiina is needed.");
  }

  const maxAge = query.maxAge ?? DEFAULT_MAX_AGE_DAYS;
  if (!Number.isFinite(maxAge) || maxAge < 0) throw new Error("invalid maxAge");
  const since = new Date(Date.now() - Math.round(maxAge) * 86_400_000);

  const eventRows = await db.query.events.findMany({
    columns: eventListColumns,
    where: {
      deletedAt: { isNull: true },
      listed: true,
      draft: false,
      OR: [{ registrationEndDate: { gt: since } }, { date: { gt: since } }, { endDate: { gt: since } }],
      ...(query.category ? { category: query.category } : {}),
    },
    with: eventListWith,
  });

  if (eventRows.length === 0) return [];

  const allQuotaIds = eventRows.flatMap((e) => e.quotas.map((q) => q.id));
  const signupCountMap = await fetchSignupCounts(allQuotaIds);

  const enrichedEvents = eventRows.map((event) => {
    const langFields = reconstructEventLanguages(event, event.languages, event.quotas, event.questions, false);
    return { ...event, ...langFields };
  });

  const res = sortEvents(enrichedEvents).map((event) => ({
    ...event,
    quotas: event.quotas.map((quota) => ({
      ...quota,
      signupCount: signupCountMap.get(quota.id) ?? 0,
    })),
  }));

  return res;
}

/** Get the admin events list with editor user IDs per event. */
export async function getEventsListForAdmin() {
  const eventRows = await db.query.events.findMany({
    columns: eventListColumns,
    where: {
      deletedAt: { isNull: true },
    },
    with: { ...eventListWith, editors: { columns: { userId: true } } },
  });

  if (eventRows.length === 0) return [];

  const allQuotaIds = eventRows.flatMap((e) => e.quotas.map((q) => q.id));
  const signupCountMap = await fetchSignupCounts(allQuotaIds);

  const enrichedEvents = eventRows.map((event) => {
    const langFields = reconstructEventLanguages(event, event.languages, event.quotas, event.questions, true);
    return { ...event, ...langFields };
  });

  const res = sortEvents(enrichedEvents).map((event) => ({
    ...event,
    quotas: event.quotas.map((quota) => ({
      ...quota,
      signupCount: signupCountMap.get(quota.id) ?? 0,
    })),
  }));

  return res;
}

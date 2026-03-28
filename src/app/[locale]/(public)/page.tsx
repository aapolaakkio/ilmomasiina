import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { appLocaleToBcp47 } from "@/i18n/intlLocale";
import { redirect } from "@/i18n/navigation";
import { getLocalizedEventListItem } from "@/lib/localizedEvent";
import { eventsToRows } from "@/lib/eventListUtils";
import { ErrorCode } from "@/db/schema";
import { getCachedEventList } from "@/cache/events";
import CustomError from "@/util/customError";

import { EventListCards, EventListTable } from "./eventListViews";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("events");
  return { title: t("title") };
}

export default async function EventListPage(_props: PageProps<"/[locale]">) {
  const locale = await getLocale();

  let events;
  try {
    events = await getCachedEventList({}, false);
  } catch (err) {
    if (err instanceof CustomError && err.code === ErrorCode.INITIAL_SETUP_NEEDED) {
      redirect({ href: "/login", locale });
    }
    throw err;
  }

  const t = await getTranslations("events");
  const tState = await getTranslations("signupState");

  const localizedEvents = events.map((event) => getLocalizedEventListItem(event, locale));
  const tableRows = eventsToRows(localizedEvents).filter((row) => row.type !== "waitlist");
  const bcp47Locale = appLocaleToBcp47(locale);

  return (
    <>
      <div className="mb-8 flex items-center gap-3">
        <div className="h-6 w-1 bg-accent" />
        <h1 className="text-2xl font-extrabold tracking-wider">{t("title")}</h1>
      </div>

      <EventListTable tableRows={tableRows} bcp47Locale={bcp47Locale} t={t} tState={tState} />
      <EventListCards tableRows={tableRows} bcp47Locale={bcp47Locale} t={t} tState={tState} />
    </>
  );
}

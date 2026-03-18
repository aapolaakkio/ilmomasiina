import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link, redirect } from "@/i18n/navigation";
import { getLocalizedEventListItem } from "@/lib/localizedEvent";
import { eventsToRows } from "@/lib/eventListUtils";
import { SignupState, type SignupStateInfo } from "@/lib/signupState";
import { ErrorCode } from "@/db/schema";
import { env } from "@/env";
import { getEventsListForUser } from "@/services/events/getEventsList";
import CustomError from "@/util/customError";

const dateFormatBase: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour12: false,
  timeZone: env.APP_TIMEZONE,
};

function formatDate(date: Date | null, locale: string): string {
  if (!date) return "";
  return new Intl.DateTimeFormat(locale, dateFormatBase).format(date);
}

function formatDateTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    ...dateFormatBase,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
  }).format(date);
}

function getSignupStateText(
  state: SignupStateInfo,
  locale: string,
  tState: (key: string, values?: Record<string, string>) => string,
) {
  switch (state.state) {
    case SignupState.disabled:
      return { label: "", className: "" };
    case SignupState.not_opened:
      return {
        label: tState("notOpenedShort", { date: formatDateTime(state.opens, locale) }),
        className: "text-yellow-600",
      };
    case SignupState.open:
      return {
        label: tState("openShort", { date: formatDateTime(state.closes, locale) }),
        className: "text-green-600",
      };
    case SignupState.closed:
      return {
        label: tState("closedShort", { date: formatDateTime(state.closed, locale) }),
        className: "text-gray-500",
      };
    default:
      return { label: "", className: "" };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("events");
  return { title: t("title") };
}

export default async function EventListPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; maxAge?: string }>;
}) {
  const { locale: language } = await params;
  const paramsResolved = await searchParams;

  let events;
  try {
    events = await getEventsListForUser(
      { category: paramsResolved.category, maxAge: paramsResolved.maxAge ? Number(paramsResolved.maxAge) : undefined },
      false,
    );
  } catch (err) {
    if (err instanceof CustomError && err.code === ErrorCode.INITIAL_SETUP_NEEDED) {
      redirect({ href: "/setup", locale: language });
    }
    throw err;
  }

  const t = await getTranslations("events");
  const tState = await getTranslations("signupState");

  const localizedEvents = events.map((event) => getLocalizedEventListItem(event, language));
  const tableRows = eventsToRows(localizedEvents).filter((row) => row.type !== "waitlist");
  const locale = language === "en" ? "en-FI" : "fi-FI";

  return (
    <>
      <div className="mb-8 flex items-center gap-3">
        <div className="h-6 w-1 bg-accent" />
        <h1 className="text-2xl font-extrabold tracking-wider">{t("title")}</h1>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 font-semibold text-gray-600">{t("name")}</th>
              <th className="px-4 py-3 font-semibold text-gray-600">{t("date")}</th>
              <th className="px-4 py-3 font-semibold text-gray-600">{t("signup")}</th>
              <th className="px-4 py-3 font-semibold text-gray-600">{t("signups")}</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => {
              if (row.type === "event") {
                const stateText = getSignupStateText(row.signupState, locale, tState);
                return (
                  <tr key={row.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                    <td className="min-w-[300px] px-4 py-3">
                      <Link
                        href={`/events/${row.slug}`}
                        className="font-medium text-gray-900 no-underline hover:text-brand-600"
                      >
                        {row.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.date ? formatDate(row.date, locale) : ""}</td>
                    <td className={`px-4 py-3 text-sm ${stateText.className}`}>{stateText.label}</td>
                    {row.signupState.state !== SignupState.disabled && (
                      <td className="px-4 py-3 text-gray-700">
                        {row.signupCount !== undefined && row.signupCount}
                        {row.quotaSize != null && <>&ensp;/&ensp;{row.quotaSize}</>}
                      </td>
                    )}
                  </tr>
                );
              }
              return (
                <tr key={row.id} className="bg-gray-50/50">
                  <td className="py-1 pl-8 pr-4 text-sm text-gray-600">
                    {row.type === "openquota" ? t("openQuota") : row.title}
                  </td>
                  <td className="px-4 py-1" aria-label="Date" />
                  <td className="px-4 py-1" aria-label="Signup state" />
                  <td className="px-4 py-1 text-gray-700">
                    {row.signupCount}
                    {row.quotaSize != null && <>&ensp;/&ensp;{row.quotaSize}</>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="space-y-0 sm:hidden">
        {tableRows.map((row) => {
          if (row.type === "event") {
            const stateText = getSignupStateText(row.signupState, locale, tState);
            return (
              <div key={row.id} className="border-b border-gray-200 py-3">
                <Link href={`/events/${row.slug}`} className="font-semibold text-brand-600 hover:underline">
                  {row.title}
                </Link>
                {row.date && <p className="text-sm text-gray-600">{formatDate(row.date, locale)}</p>}
                {stateText.label && <p className={`text-sm ${stateText.className}`}>{stateText.label}</p>}
              </div>
            );
          }
          return (
            <div key={row.id} className="pl-4 text-sm text-gray-600">
              <span className="font-semibold">{row.type === "openquota" ? t("openQuota") : row.title}</span>
              <span className="ml-2 text-gray-700">
                {row.signupCount}
                {row.quotaSize != null && ` / ${row.quotaSize}`}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

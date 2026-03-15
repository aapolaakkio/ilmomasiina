import { getTranslations } from "next-intl/server";

import { Link, redirect } from "@/i18n/navigation";
import { getLocalizedEventListItem } from "@/lib/localizedEvent";
import { eventsToRows } from "@/lib/eventListUtils";
import { SignupState } from "@/lib/signupState";
import { ErrorCode } from "@/models";
import { getEventsListForUser } from "@/services/events/getEventsList";
import CustomError from "@/util/customError";

function formatDate(date: Date | null, locale: string): string {
  if (!date) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour12: false,
    timeZone: process.env.APP_TIMEZONE ?? "Europe/Helsinki",
  }).format(date);
}

function formatDateTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    timeZone: process.env.APP_TIMEZONE ?? "Europe/Helsinki",
  }).format(date);
}

type SignupStateInfo =
  | { state: typeof SignupState.disabled }
  | { state: typeof SignupState.not_opened; opens: Date }
  | { state: typeof SignupState.open; closes: Date }
  | { state: typeof SignupState.closed; closed: Date };

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
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-3 pr-4 font-semibold text-gray-700">{t("name")}</th>
              <th className="pb-3 pr-4 font-semibold text-gray-700">{t("date")}</th>
              <th className="pb-3 pr-4 font-semibold text-gray-700">{t("signup")}</th>
              <th className="pb-3 font-semibold text-gray-700">{t("signups")}</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => {
              if (row.type === "event") {
                const stateText = getSignupStateText(row.signupState, locale, tState);
                return (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="min-w-[300px] py-3 pr-4">
                      <Link href={`/events/${row.slug}`} className="text-brand-600 hover:underline">
                        {row.title}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{row.date ? formatDate(row.date, locale) : ""}</td>
                    <td className={`py-3 pr-4 text-sm ${stateText.className}`}>{stateText.label}</td>
                    {row.signupState.state !== SignupState.disabled && (
                      <td className="py-3 text-gray-600">
                        {row.signupCount !== undefined && row.signupCount}
                        {row.quotaSize != null && <>&ensp;/&ensp;{row.quotaSize}</>}
                      </td>
                    )}
                  </tr>
                );
              }
              return (
                <tr key={row.id} className="border-b border-gray-100 bg-gray-50">
                  <td className="py-2 pl-6 pr-4 text-gray-500">
                    {row.type === "openquota" ? t("openQuota") : row.title}
                  </td>
                  <td className="py-2 pr-4" aria-label="Date" />
                  <td className="py-2 pr-4" aria-label="Signup state" />
                  <td className="py-2 text-gray-600">
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
            <div key={row.id} className="pl-4 text-sm text-gray-500">
              <span className="font-semibold">{row.type === "openquota" ? t("openQuota") : row.title}</span>
              <span className="ml-2 text-gray-600">
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

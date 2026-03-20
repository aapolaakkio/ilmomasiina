import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { appLocaleToBcp47 } from "@/i18n/intlLocale";
import type { UserID } from "@/db/schema";
import type { AdminEventListResponse } from "@/db/zod";
import { isEventInPast, totalSignups } from "@/lib/adminEventsList";
import { formatAppDateTime } from "@/lib/intlDateTime";

import AdminEventsPastToggle from "./AdminEventsPastToggle";
import DeleteEventButton from "./DeleteEventButton";

const outlineLinkClass =
  "inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 no-underline transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 whitespace-nowrap";

/** Matches UI `Button` primary + small; anchor-only so we avoid invalid `<a><button>` nesting. */
const primaryLinkClass =
  "inline-flex items-center justify-center gap-2 rounded-md border border-transparent bg-brand-600 px-3 py-1.5 text-xs font-medium text-white no-underline transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 whitespace-nowrap";

type Props = {
  events: AdminEventListResponse;
  showPast: boolean;
  role: "admin" | "user";
  userId: UserID;
};

function getEventStatus(event: AdminEventListResponse[number], t: (key: string) => string): string {
  if (event.draft) return t("statusDraft");
  if (isEventInPast(event)) {
    return event.registrationEndDate && new Date(event.registrationEndDate) < new Date()
      ? t("statusClosed")
      : t("statusEnded");
  }
  if (!event.listed) return t("statusHidden");
  return t("statusPublished");
}

function formatEventListDate(date: string | null, bcp47Locale: string): string {
  if (!date) return "";
  return formatAppDateTime(new Date(date), bcp47Locale, "date");
}

export default async function AdminEventsList({ events, showPast, role, userId }: Props) {
  const t = await getTranslations("adminEvents");
  const locale = appLocaleToBcp47(await getLocale());

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{showPast ? t("titlePast") : t("title")}</h1>
      <nav className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {role === "admin" && (
            <>
              <Link href="/admin/users" className={outlineLinkClass}>
                {t("users")}
              </Link>
              <Link href="/admin/auditlog" className={outlineLinkClass}>
                {t("auditLog")}
              </Link>
            </>
          )}
          <Link href="/admin/edit/new" className={primaryLinkClass}>
            {t("newEvent")}
          </Link>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <AdminEventsPastToggle
            showPast={showPast}
            labelUpcoming={t("upcomingEvents")}
            labelPast={t("pastEvents")}
            className={`${outlineLinkClass} cursor-pointer disabled:cursor-wait disabled:opacity-60`}
          />
        </div>
      </nav>

      {events.length === 0 ? (
        <p className="text-gray-600">{showPast ? t("noEventsPast") : t("noEventsUpcoming")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 pr-4 font-semibold text-gray-700">{t("name")}</th>
                <th className="pb-3 pr-4 font-semibold text-gray-700">{t("date")}</th>
                <th className="pb-3 pr-4 font-semibold text-gray-700">{t("status")}</th>
                <th className="pb-3 pr-4 font-semibold text-gray-700">{t("signups")}</th>
                <th className="pb-3 font-semibold text-gray-700">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const canEdit = role === "admin" || (event.editors?.some((e) => e.userId === userId) ?? false);
                return (
                  <tr key={event.id} className="border-b border-gray-100">
                    <td className="py-3 pr-4">
                      <Link href={`/admin/edit/${event.id}`} className="text-brand-600 hover:underline">
                        {event.title}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {formatEventListDate(event.date?.toISOString() ?? null, locale)}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {!event.draft && event.slug ? (
                        <Link href={`/event/${event.slug}`} className="text-brand-600 hover:underline" target="_blank">
                          {getEventStatus(event, t)}
                        </Link>
                      ) : (
                        getEventStatus(event, t)
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{totalSignups(event)}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        <Link href={`/admin/edit/${event.id}`} className={outlineLinkClass}>
                          {canEdit ? t("edit") : t("view")}
                        </Link>
                        <Link href={`/admin/copy/${event.id}`} className={outlineLinkClass}>
                          {t("copy")}
                        </Link>
                        {canEdit && <DeleteEventButton eventId={event.id} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

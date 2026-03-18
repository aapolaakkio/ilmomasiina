"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { deleteEventAction } from "@/actions/deleteEvent";
import { Link, useRouter } from "@/i18n/navigation";
import type { EventID, UserID } from "@/db/schema";
import type { AdminEventListResponse } from "@/db/zod";
import { getEffectiveEndDate } from "@/db/computed";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

function isEventInPast(event: AdminEventListResponse[number]): boolean {
  const endDate = getEffectiveEndDate(event);
  return endDate != null && endDate < Date.now();
}

function formatDate(date: string | null, locale: string): string {
  if (!date) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour12: false,
    timeZone: "Europe/Helsinki",
  }).format(new Date(date));
}

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

type Props = {
  events: AdminEventListResponse;
  role: "admin" | "user";
  userId: UserID;
};

export default function AdminEventsClient({ events, role, userId }: Props) {
  const router = useRouter();
  const t = useTranslations("adminEvents");
  const [showPast, setShowPast] = useState(false);
  const [deleting, setDeleting] = useState<EventID | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    const filtered = events.filter((e) => isEventInPast(e) === showPast);
    return showPast ? filtered.reverse() : filtered;
  }, [events, showPast]);

  const totalSignups = (event: AdminEventListResponse[number]) =>
    event.quotas.reduce((sum, q) => sum + q.signupCount, 0);

  const handleDelete = useCallback(
    async (eventId: EventID) => {
      // eslint-disable-next-line no-alert
      if (!window.confirm(t("deleteConfirm"))) return;
      setDeleting(eventId);
      setError(null);
      try {
        await deleteEventAction({ eventId });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : t("deleteFailed"));
      } finally {
        setDeleting(null);
      }
    },
    [router],
  );

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{showPast ? t("titlePast") : t("title")}</h1>
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}
      <nav className="mb-4 flex flex-wrap gap-2">
        {role === "admin" && (
          <>
            <Link href="/admin/users">
              <Button variant="outline" size="small">
                {t("users")}
              </Button>
            </Link>
            <Link href="/admin/auditlog">
              <Button variant="outline" size="small">
                {t("auditLog")}
              </Button>
            </Link>
          </>
        )}
        <Link href="/admin/edit/new">
          <Button variant="primary" size="small">
            {t("newEvent")}
          </Button>
        </Link>
        <Button variant="outline" size="small" className="ml-auto" onClick={() => setShowPast(!showPast)}>
          {showPast ? t("upcomingEvents") : t("pastEvents")}
        </Button>
      </nav>

      {filteredEvents.length === 0 ? (
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
              {filteredEvents.map((event) => {
                const canEdit = role === "admin" || (event.editors?.some((e) => e.userId === userId) ?? false);
                return (
                  <tr key={event.id} className="border-b border-gray-100">
                    <td className="py-3 pr-4">
                      <Link href={`/admin/edit/${event.id}`} className="text-brand-600 hover:underline">
                        {event.title}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {formatDate(event.date?.toISOString() ?? null, "fi-FI")}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {!event.draft && event.slug ? (
                        <Link href={`/events/${event.slug}`} className="text-brand-600 hover:underline" target="_blank">
                          {getEventStatus(event, t)}
                        </Link>
                      ) : (
                        getEventStatus(event, t)
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{totalSignups(event)}</td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        <Link href={`/admin/edit/${event.id}`}>
                          <Button variant="outline" size="small">
                            {canEdit ? t("edit") : t("view")}
                          </Button>
                        </Link>
                        <Link href={`/admin/copy/${event.id}`}>
                          <Button variant="outline" size="small">
                            {t("copy")}
                          </Button>
                        </Link>
                        {canEdit && (
                          <Button
                            variant="danger"
                            size="small"
                            disabled={deleting === event.id}
                            onClick={() => handleDelete(event.id)}
                          >
                            {t("delete")}
                          </Button>
                        )}
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

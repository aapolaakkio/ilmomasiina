"use client";

import { useCallback, useEffect, useState } from "react";

import { useTranslations } from "next-intl";

import { getAuditLogAction } from "@/actions/getAuditLog";
import { Link } from "@/i18n/navigation";
import type { AuditLogResponse, AuditLoqQuery } from "@/models";
import { AuditEvent } from "@/models";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { inputClassName, selectClassName } from "@/components/ui/Field";

const LOGS_PER_PAGE = 100;

const AUDIT_EVENT_KEYS: { value: AuditEvent; labelKey: string }[] = [
  { value: AuditEvent.CREATE_EVENT, labelKey: "actions.createEvent" },
  { value: AuditEvent.EDIT_EVENT, labelKey: "actions.editEvent" },
  { value: AuditEvent.PUBLISH_EVENT, labelKey: "actions.publishEvent" },
  { value: AuditEvent.UNPUBLISH_EVENT, labelKey: "actions.unpublishEvent" },
  { value: AuditEvent.DELETE_EVENT, labelKey: "actions.deleteEvent" },
  { value: AuditEvent.CREATE_SIGNUP, labelKey: "actions.createSignup" },
  { value: AuditEvent.EDIT_SIGNUP, labelKey: "actions.editSignup" },
  { value: AuditEvent.DELETE_SIGNUP, labelKey: "actions.deleteSignup" },
  { value: AuditEvent.PROMOTE_SIGNUP, labelKey: "actions.promoteSignup" },
  { value: AuditEvent.CREATE_USER, labelKey: "actions.createUser" },
  { value: AuditEvent.DELETE_USER, labelKey: "actions.deleteUser" },
];

function formatActionDescription(
  item: AuditLogResponse["rows"][number],
  t: (key: string, values?: Record<string, string>) => string,
): string {
  const extra = item.extra ? JSON.parse(item.extra) : null;
  const event = item.eventName ?? item.eventId ?? "?";
  const signup = item.signupName ?? item.signupId ?? "?";

  switch (item.action) {
    case AuditEvent.CREATE_EVENT:
      return t("description.createdEvent", { event });
    case AuditEvent.EDIT_EVENT:
      return t("description.editedEvent", { event });
    case AuditEvent.PUBLISH_EVENT:
      return t("description.publishedEvent", { event });
    case AuditEvent.UNPUBLISH_EVENT:
      return t("description.unpublishedEvent", { event });
    case AuditEvent.DELETE_EVENT:
      return t("description.deletedEvent", { event });
    case AuditEvent.CREATE_SIGNUP:
      return t("description.createdSignup", { signup, event });
    case AuditEvent.EDIT_SIGNUP:
      return t("description.editedSignup", { signup, event });
    case AuditEvent.DELETE_SIGNUP:
      return t("description.deletedSignup", { signup, event });
    case AuditEvent.PROMOTE_SIGNUP:
      return t("description.promotedSignup", { signup, event });
    case AuditEvent.CREATE_USER:
      return t("description.createdUser", { user: extra?.email ?? "?" });
    case AuditEvent.DELETE_USER:
      return t("description.deletedUser", { user: extra?.email ?? "?" });
    default:
      return t("description.unknown", { action: item.action });
  }
}

export default function AuditLogClient() {
  const t = useTranslations("auditLog");
  const [logs, setLogs] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<AuditLoqQuery>({ limit: LOGS_PER_PAGE, offset: 0 });

  const fetchLogs = useCallback(async (q: AuditLoqQuery) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAuditLogAction(q);
      if (result?.data) {
        setLogs(result.data);
      } else if (result?.serverError) {
        setError(result.serverError);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(query);
  }, [query, fetchLogs]);

  const updateFilter = useCallback((key: keyof AuditLoqQuery, value: string | AuditEvent[] | undefined) => {
    setQuery((prev) => ({
      ...prev,
      [key]: value || undefined,
      // Reset pagination when changing filters (except offset/limit)
      ...(key !== "offset" && key !== "limit" ? { offset: 0 } : {}),
    }));
  }, []);

  const offset = query.offset ?? 0;
  const lastRow = logs ? Math.min(offset + LOGS_PER_PAGE, logs.count) : 0;

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1>
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}
      <Link href="/admin" className="mb-4 inline-block">
        <Button variant="outline" size="small">
          {t("back")}
        </Button>
      </Link>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          className={`${inputClassName} max-w-[150px]`}
          placeholder={t("filterUser")}
          onChange={(e) => updateFilter("user", e.target.value)}
        />
        <input
          type="text"
          className={`${inputClassName} max-w-[150px]`}
          placeholder={t("filterIp")}
          onChange={(e) => updateFilter("ip", e.target.value)}
        />
        <input
          type="text"
          className={`${inputClassName} max-w-[150px]`}
          placeholder={t("filterEvent")}
          onChange={(e) => updateFilter("event", e.target.value)}
        />
        <input
          type="text"
          className={`${inputClassName} max-w-[150px]`}
          placeholder={t("filterSignup")}
          onChange={(e) => updateFilter("signup", e.target.value)}
        />
        <select
          className={`${selectClassName} max-w-[200px]`}
          onChange={(e) => updateFilter("action", e.target.value ? ([e.target.value] as AuditEvent[]) : undefined)}
        >
          <option value="">{t("filterAction")}</option>
          {AUDIT_EVENT_KEYS.map((ae) => (
            <option key={ae.value} value={ae.value}>
              {t(ae.labelKey)}
            </option>
          ))}
        </select>
      </div>

      {/* Pagination */}
      {logs && (
        <div className="mb-3 flex items-center gap-2">
          <Button
            variant="outline"
            size="small"
            disabled={offset === 0}
            onClick={() => updateFilter("offset", String(Math.max(0, offset - LOGS_PER_PAGE)))}
          >
            {"\u00AB " + t("pagination.previous")}
          </Button>
          <span className="text-sm text-gray-600">
            {t("pagination.rows", { first: offset + 1, last: lastRow, total: logs.count })}
          </span>
          <Button
            variant="outline"
            size="small"
            disabled={lastRow >= logs.count}
            onClick={() => updateFilter("offset", String(offset + LOGS_PER_PAGE))}
          >
            {t("pagination.next") + " \u00BB"}
          </Button>
        </div>
      )}

      {/* Table */}
      {loading && <p className="text-gray-500">Loading...</p>}
      {!loading && logs && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 pr-4 font-semibold text-gray-700">{t("time")}</th>
                <th className="pb-3 pr-4 font-semibold text-gray-700">{t("user")}</th>
                <th className="pb-3 pr-4 font-semibold text-gray-700">{t("ipAddress")}</th>
                <th className="pb-3 font-semibold text-gray-700">{t("action")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.rows.map((item) => (
                <tr key={`${item.createdAt}-${item.action}-${item.signupId}`} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-600">
                    {new Intl.DateTimeFormat("fi-FI", {
                      day: "numeric",
                      month: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                      second: "numeric",
                      hour12: false,
                    }).format(new Date(item.createdAt))}
                  </td>
                  <td className="py-2 pr-4">{item.user ?? "-"}</td>
                  <td className="py-2 pr-4 text-gray-600">{item.ipAddress ?? "-"}</td>
                  <td className="py-2">{formatActionDescription(item, t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

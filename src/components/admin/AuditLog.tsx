"use client";

import { useEffect, useState } from "react";

import { useTranslations } from "next-intl";

import { getAuditLogAction } from "@/actions/getAuditLog";
import { Link } from "@/i18n/navigation";
import { AuditEvent } from "@/db/schema";
import type { AuditLogResponse, AuditLogQuery } from "@/db/zod";
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

/** Maps audit actions to their description translation key and required variables. */
const ACTION_DESCRIPTIONS: Record<AuditEvent, { key: string; vars: "event" | "signup" | "user" }> = {
  [AuditEvent.CREATE_EVENT]: { key: "description.createdEvent", vars: "event" },
  [AuditEvent.EDIT_EVENT]: { key: "description.editedEvent", vars: "event" },
  [AuditEvent.PUBLISH_EVENT]: { key: "description.publishedEvent", vars: "event" },
  [AuditEvent.UNPUBLISH_EVENT]: { key: "description.unpublishedEvent", vars: "event" },
  [AuditEvent.DELETE_EVENT]: { key: "description.deletedEvent", vars: "event" },
  [AuditEvent.CREATE_SIGNUP]: { key: "description.createdSignup", vars: "signup" },
  [AuditEvent.EDIT_SIGNUP]: { key: "description.editedSignup", vars: "signup" },
  [AuditEvent.DELETE_SIGNUP]: { key: "description.deletedSignup", vars: "signup" },
  [AuditEvent.PROMOTE_SIGNUP]: { key: "description.promotedSignup", vars: "signup" },
  [AuditEvent.CREATE_USER]: { key: "description.createdUser", vars: "user" },
  [AuditEvent.DELETE_USER]: { key: "description.deletedUser", vars: "user" },
};

function formatActionDescription(
  item: AuditLogResponse["rows"][number],
  t: (key: string, values?: Record<string, string | AuditEvent>) => string,
): string {
  const desc = ACTION_DESCRIPTIONS[item.action as AuditEvent];
  if (!desc) return t("description.unknown", { action: item.action });

  const event = item.eventName ?? item.eventId ?? "?";
  const signup = item.signupName ?? item.signupId ?? "?";
  if (desc.vars === "event") return t(desc.key, { event });
  if (desc.vars === "signup") return t(desc.key, { signup, event });
  const extra = item.extra ? JSON.parse(item.extra) : null;
  return t(desc.key, { user: extra?.email ?? "?" });
}

const auditDateFormat = new Intl.DateTimeFormat("fi-FI", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hour12: false,
});

export default function AuditLogClient() {
  const t = useTranslations("auditLog");
  const [logs, setLogs] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<AuditLogQuery>({
    limit: LOGS_PER_PAGE,
    offset: 0,
  });

  const fetchLogs = async (q: AuditLogQuery) => {
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
  };

  useEffect(() => {
    fetchLogs(query);
  }, [query]);

  const updateFilter = (key: keyof AuditLogQuery, value: string | AuditEvent[] | undefined) => {
    setQuery((prev) => ({
      ...prev,
      [key]: value || undefined,
      // Reset pagination when changing filters (except offset/limit)
      ...(key !== "offset" && key !== "limit" ? { offset: 0 } : {}),
    }));
  };

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
            {t("pagination.rows", {
              first: offset + 1,
              last: lastRow,
              total: logs.count,
            })}
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
                  <td className="py-2 pr-4 text-gray-600">{auditDateFormat.format(new Date(item.createdAt))}</td>
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

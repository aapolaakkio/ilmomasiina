import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { appLocaleToBcp47 } from "@/i18n/intlLocale";
import { AuditEvent } from "@/db/schema";
import type { AuditLogResponse, AuditLogQuery } from "@/db/zod";
import { AUDIT_LOG_PAGE_SIZE, auditLogQueryToSearchParams, auditLogSearchSuffix } from "@/lib/auditLogUrl";
import { formatAppDateTime } from "@/lib/intlDateTime";

import AuditLogFilterForm from "./AuditLogFilterForm";

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

const outlineButtonClass =
  "inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:text-gray-400 disabled:bg-gray-50";

type Props = {
  query: AuditLogQuery;
  logs: AuditLogResponse;
};

export default async function AuditLogView({ query, logs }: Props) {
  const t = await getTranslations("auditLog");
  const bcp47Locale = appLocaleToBcp47(await getLocale());
  const offset = query.offset ?? 0;
  const lastRow = Math.min(offset + AUDIT_LOG_PAGE_SIZE, logs.count);

  const prevQuery: AuditLogQuery = { ...query, offset: Math.max(0, offset - AUDIT_LOG_PAGE_SIZE) };
  const nextQuery: AuditLogQuery = { ...query, offset: offset + AUDIT_LOG_PAGE_SIZE };

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1>
      <Link href="/admin" className={`${outlineButtonClass} mb-4 inline-block no-underline`}>
        {t("back")}
      </Link>

      <AuditLogFilterForm key={auditLogQueryToSearchParams(query).toString()} query={query} />

      <div className="mb-3 flex items-center gap-2">
        {offset > 0 ? (
          <Link
            href={`/admin/auditlog${auditLogSearchSuffix(prevQuery)}`}
            className={`${outlineButtonClass} no-underline`}
          >
            {"\u00AB " + t("pagination.previous")}
          </Link>
        ) : (
          <span className={`${outlineButtonClass} pointer-events-none opacity-50`}>
            {"\u00AB " + t("pagination.previous")}
          </span>
        )}
        <span className="text-sm text-gray-600">
          {t("pagination.rows", {
            first: offset + 1,
            last: lastRow,
            total: logs.count,
          })}
        </span>
        {lastRow < logs.count ? (
          <Link
            href={`/admin/auditlog${auditLogSearchSuffix(nextQuery)}`}
            className={`${outlineButtonClass} no-underline`}
          >
            {t("pagination.next") + " \u00BB"}
          </Link>
        ) : (
          <span className={`${outlineButtonClass} pointer-events-none opacity-50`}>
            {t("pagination.next") + " \u00BB"}
          </span>
        )}
      </div>

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
                  {formatAppDateTime(new Date(item.createdAt), bcp47Locale, "dateTimeSeconds")}
                </td>
                <td className="py-2 pr-4">{item.user ?? "-"}</td>
                <td className="py-2 pr-4 text-gray-600">{item.ipAddress ?? "-"}</td>
                <td className="py-2">{formatActionDescription(item, t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

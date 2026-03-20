"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { AuditEvent } from "@/db/schema";
import type { AuditLogQuery } from "@/db/zod";
import { AUDIT_LOG_PAGE_SIZE, auditLogSearchSuffix } from "@/lib/auditLogUrl";
import { AUDIT_LOG_FILTER_EVENTS } from "@/lib/auditLogFilterEvents";

const filterInputClass =
  "box-border min-h-[2.5rem] w-full min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

const filterSelectClass =
  "select-control box-border min-h-[2.5rem] w-full min-w-0 rounded-md border border-gray-300 bg-white py-2 pl-3 pr-12 text-sm font-normal text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

const filterSubmitClass =
  "box-border inline-flex min-h-[2.5rem] w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60";

function trimmedField(fd: FormData, name: string): string | undefined {
  const v = fd.get(name);
  const s = typeof v === "string" ? v.trim() : "";
  return s || undefined;
}

function queryFromFormData(fd: FormData): AuditLogQuery {
  const actionRaw = fd.get("action");
  const actionStr = typeof actionRaw === "string" ? actionRaw.trim() : "";
  return {
    user: trimmedField(fd, "user"),
    ip: trimmedField(fd, "ip"),
    event: trimmedField(fd, "event"),
    signup: trimmedField(fd, "signup"),
    action: actionStr ? ([actionStr as AuditEvent] as NonNullable<AuditLogQuery["action"]>) : undefined,
    limit: AUDIT_LOG_PAGE_SIZE,
    offset: 0,
  };
}

type Props = {
  query: AuditLogQuery;
};

export default function AuditLogFilterForm({ query }: Props) {
  const t = useTranslations("auditLog");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const selectedAction = query.action?.[0] ?? "";

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next = queryFromFormData(fd);
    const path = `/admin/auditlog${auditLogSearchSuffix(next)}`;
    startTransition(() => {
      router.replace(path);
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50/80 p-4 sm:grid-cols-2 lg:grid-cols-6"
    >
      <input
        type="text"
        name="user"
        defaultValue={query.user ?? ""}
        className={filterInputClass}
        placeholder={t("filterUser")}
        autoComplete="off"
      />
      <input
        type="text"
        name="ip"
        defaultValue={query.ip ?? ""}
        className={filterInputClass}
        placeholder={t("filterIp")}
        autoComplete="off"
      />
      <input
        type="text"
        name="event"
        defaultValue={query.event ?? ""}
        className={filterInputClass}
        placeholder={t("filterEvent")}
        autoComplete="off"
      />
      <input
        type="text"
        name="signup"
        defaultValue={query.signup ?? ""}
        className={filterInputClass}
        placeholder={t("filterSignup")}
        autoComplete="off"
      />
      <select name="action" defaultValue={selectedAction} className={filterSelectClass}>
        <option value="">{t("filterAction")}</option>
        {AUDIT_LOG_FILTER_EVENTS.map((ae) => (
          <option key={ae.value} value={ae.value}>
            {t(ae.labelKey)}
          </option>
        ))}
      </select>
      <button type="submit" className={filterSubmitClass} disabled={pending} aria-busy={pending}>
        {t("applyFilters")}
      </button>
    </form>
  );
}

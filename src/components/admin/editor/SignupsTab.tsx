"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";

import { deleteSignupAsAdminAction } from "@/actions/deleteSignupAsAdmin";
import { getAdminEventAction } from "@/actions/getAdminEvent";
import { SignupStatus } from "@/db/schema";
import type { AdminEventResponse, AdminSignupSchema } from "@/db/zod";
import { appLocaleToBcp47 } from "@/i18n/intlLocale";
import { rowsToCsv } from "@/lib/csv";
import { isHookActionPending } from "@/lib/safeActionHook";
import { createAppDateTimeFormatter } from "@/lib/intlDateTime";
import { stringifyAnswer } from "@/lib/signupUtils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

import EditSignupModal from "./EditSignupModal";
import { type FlatSignup, formatSignupPrice, signupsAndQuotaGroups } from "./signupsDerived";

type Props = {
  savedEvent: AdminEventResponse | null;
  onEventChange?: (event: AdminEventResponse) => void;
};

export default function SignupsTab({ savedEvent, onEventChange }: Props) {
  const t = useTranslations("editor.signups");
  const locale = appLocaleToBcp47(useLocale());
  const signupsDateFormatter = createAppDateTimeFormatter(locale, "dateTimeSeconds");

  const [editingSignup, setEditingSignup] = useState<AdminSignupSchema | "new" | null>(null);
  const [groupByQuota, setGroupByQuota] = useState(false);
  const [memberEmails, setMemberEmails] = useState<string[]>([]);

  const paymentsEnabled = savedEvent?.payments !== "disabled";
  const hasMemberCheck = savedEvent?.emailQuestion && memberEmails.length > 0;

  const { signups, quotaGroups } = signupsAndQuotaGroups(savedEvent);

  function formatStatus(signup: FlatSignup) {
    switch (signup.status) {
      case SignupStatus.IN_QUOTA:
        return t("statusInQuota");
      case SignupStatus.IN_OPEN_QUOTA:
        return t("statusInOpen");
      case SignupStatus.IN_QUEUE:
        return t("statusInQueue", { position: signup.position ?? 0 });
      default:
        return "";
    }
  }

  function formatPaymentBadge(signup: FlatSignup): {
    label: string;
    variant: "success" | "warning" | "secondary";
  } | null {
    if (!signup.paymentStatus) return null;
    switch (signup.paymentStatus) {
      case "paid":
        return { label: t("paymentPaid"), variant: "success" };
      case "pending":
        return { label: t("paymentPending"), variant: "warning" };
      case "refunded":
        return { label: t("paymentRefunded"), variant: "secondary" };
      default:
        return null;
    }
  }

  const handleDownloadCsv = () => {
    if (!savedEvent) return;

    const headers = [
      ...(savedEvent.nameQuestion ? [t("firstName"), t("lastName")] : []),
      ...(savedEvent.emailQuestion ? [t("email")] : []),
      ...(hasMemberCheck ? [t("membership")] : []),
      t("quota"),
      t("status"),
      ...savedEvent.questions.map((q) => q.question),
      ...(paymentsEnabled ? [t("price"), t("paymentStatus")] : []),
      t("time"),
    ];

    const rows = signups.map((signup) => [
      ...(savedEvent.nameQuestion ? [signup.firstName ?? "", signup.lastName ?? ""] : []),
      ...(savedEvent.emailQuestion ? [signup.email ?? ""] : []),
      ...(hasMemberCheck ? [signup.email && memberEmails.includes(signup.email) ? "Yes" : "No"] : []),
      signup.quotaTitle,
      formatStatus(signup),
      ...savedEvent.questions.map((q) => {
        const answer = signup.answers?.find((a) => a.questionId === q.id);
        return stringifyAnswer(answer?.answer);
      }),
      ...(paymentsEnabled ? [formatSignupPrice(signup), signup.paymentStatus ?? ""] : []),
      signupsDateFormatter.format(new Date(signup.createdAt)),
    ]);

    const csv = rowsToCsv([headers, ...rows]);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${savedEvent.title ?? "signups"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const refreshEvent = async () => {
    if (!savedEvent || !onEventChange) return;
    const result = await getAdminEventAction({ eventId: savedEvent.id });
    if (result?.data) {
      onEventChange(result.data);
    }
  };

  const { execute: executeDeleteAdminSignup, status: deleteAdminSignupStatus } = useAction(deleteSignupAsAdminAction, {
    onSuccess: () => {
      void refreshEvent();
    },
  });

  const handleDelete = (signupId: string) => {
    if (!window.confirm(t("deleteConfirm"))) return;
    if (isHookActionPending(deleteAdminSignupStatus)) return;
    executeDeleteAdminSignup({ signupId });
  };

  const headerCells = (
    <tr className="border-b border-gray-200">
      <th className="pb-3 pr-4 font-semibold text-gray-700">#</th>
      {savedEvent?.nameQuestion && (
        <>
          <th className="pb-3 pr-4 font-semibold text-gray-700">{t("firstName")}</th>
          <th className="pb-3 pr-4 font-semibold text-gray-700">{t("lastName")}</th>
        </>
      )}
      {savedEvent?.emailQuestion && <th className="pb-3 pr-4 font-semibold text-gray-700">{t("email")}</th>}
      {hasMemberCheck && <th className="pb-3 pr-4 font-semibold text-gray-700">{t("membership")}</th>}
      <th className="pb-3 pr-4 font-semibold text-gray-700">{t("quota")}</th>
      <th className="pb-3 pr-4 font-semibold text-gray-700">{t("status")}</th>
      {paymentsEnabled && (
        <>
          <th className="pb-3 pr-4 font-semibold text-gray-700">{t("price")}</th>
          <th className="pb-3 pr-4 font-semibold text-gray-700">{t("paymentStatus")}</th>
        </>
      )}
      <th className="pb-3 pr-4 font-semibold text-gray-700">{t("time")}</th>
      <th className="pb-3 font-semibold text-gray-700">{t("actions")}</th>
    </tr>
  );

  function renderSignupRow(signup: FlatSignup, index: number) {
    const payment = formatPaymentBadge(signup);
    return (
      <tr
        key={signup.id}
        className={`border-b border-gray-100 ${signup.deletedAt ? "text-gray-400 line-through" : ""}`}
      >
        <td className="py-2 pr-4">{index + 1}</td>
        {savedEvent?.nameQuestion && (
          <>
            {signup.confirmed ? (
              <>
                <td className="py-2 pr-4">{signup.firstName}</td>
                <td className="py-2 pr-4">{signup.lastName}</td>
              </>
            ) : (
              <td className="py-2 pr-4 italic text-gray-400" colSpan={2}>
                {t("unconfirmed")}
              </td>
            )}
          </>
        )}
        {savedEvent?.emailQuestion && <td className="py-2 pr-4">{signup.email}</td>}
        {hasMemberCheck && (
          <td className="py-2 pr-4">{signup.email && memberEmails.includes(signup.email) ? "\u2705" : ""}</td>
        )}
        <td className="py-2 pr-4">{signup.quotaTitle}</td>
        <td className="py-2 pr-4 text-gray-600">{formatStatus(signup)}</td>
        {paymentsEnabled && (
          <>
            <td className="py-2 pr-4 text-gray-600">{formatSignupPrice(signup)}</td>
            <td className="py-2 pr-4">
              {payment ? <Badge variant={payment.variant}>{payment.label}</Badge> : "\u2014"}
            </td>
          </>
        )}
        <td className="py-2 pr-4 text-gray-600">{signupsDateFormatter.format(new Date(signup.createdAt))}</td>
        <td className="py-2">
          <div className="flex gap-1">
            {!signup.deletedAt && (
              <>
                <Button variant="outline" size="small" onClick={() => setEditingSignup(signup)}>
                  {t("edit")}
                </Button>
                <Button
                  variant="danger"
                  size="small"
                  actionStatus={deleteAdminSignupStatus}
                  onClick={() => handleDelete(signup.id)}
                >
                  {t("delete")}
                </Button>
              </>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="primary" size="small" onClick={() => setEditingSignup("new")}>
          {t("create")}
        </Button>
        {signups.length > 0 && (
          <Button variant="outline" size="small" onClick={handleDownloadCsv}>
            {t("download")}
          </Button>
        )}
        {signups.length > 0 && (
          <label className="ml-auto flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-brand-600"
              checked={groupByQuota}
              onChange={(e) => setGroupByQuota(e.target.checked)}
            />
            {t("groupByQuota")}
          </label>
        )}
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="check-memberships">
          {t("checkMemberships")}
        </label>
        <textarea
          id="check-memberships"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
          rows={3}
          disabled={!savedEvent?.emailQuestion}
          placeholder={t(savedEvent?.emailQuestion ? "checkMembershipsPlaceholder" : "checkMembershipsDisabled")}
          onChange={(e) =>
            setMemberEmails(
              e.target.value
                .split("\n")
                .map((email) => email.trim())
                .filter(Boolean),
            )
          }
        />
      </div>

      {signups.length === 0 ? (
        <p className="text-sm text-gray-500">{t("noSignups")}</p>
      ) : (
        <div className="overflow-x-auto">
          {groupByQuota ? (
            quotaGroups.map((group) => (
              <div key={group.key} className="mb-6">
                <h3 className="mb-2 text-sm font-semibold text-gray-800">
                  {group.title} ({group.signups.length})
                </h3>
                <table className="w-full text-left text-sm">
                  <thead>{headerCells}</thead>
                  <tbody>{group.signups.map((signup, i) => renderSignupRow(signup, i))}</tbody>
                </table>
              </div>
            ))
          ) : (
            <table className="w-full text-left text-sm">
              <thead>{headerCells}</thead>
              <tbody>{signups.map((signup, i) => renderSignupRow(signup, i))}</tbody>
            </table>
          )}
        </div>
      )}

      {editingSignup && savedEvent && (
        <EditSignupModal
          event={savedEvent}
          signup={editingSignup === "new" ? undefined : editingSignup}
          onClose={() => setEditingSignup(null)}
          onSave={refreshEvent}
        />
      )}
    </div>
  );
}

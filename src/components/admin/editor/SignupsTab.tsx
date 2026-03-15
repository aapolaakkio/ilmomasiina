"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { deleteSignupAsAdminAction } from "@/actions/deleteSignupAsAdmin";
import type { AdminEventResponse } from "@/models";
import { stringifyAnswer } from "@/lib/signupUtils";
import { Button } from "@/components/ui/Button";

type Props = {
  savedEvent: AdminEventResponse | null;
};

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

export default function SignupsTab({ savedEvent }: Props) {
  const router = useRouter();
  const t = useTranslations("editor");

  const signups = useMemo(
    () => savedEvent?.quotas.flatMap((q) => q.signups.map((s) => ({ ...s, quotaTitle: q.title }))) ?? [],
    [savedEvent],
  );

  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat("fi-FI", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false,
      }),
    [],
  );

  const handleDownloadCsv = useCallback(() => {
    if (!savedEvent) return;

    const headers = [
      ...(savedEvent.nameQuestion ? [t("signups.firstName"), t("signups.lastName")] : []),
      ...(savedEvent.emailQuestion ? [t("signups.email")] : []),
      t("signups.quota"),
      ...savedEvent.questions.map((q) => q.question),
      t("signups.time"),
    ];

    const rows = signups.map((signup) => [
      ...(savedEvent.nameQuestion ? [signup.firstName ?? "", signup.lastName ?? ""] : []),
      ...(savedEvent.emailQuestion ? [signup.email ?? ""] : []),
      signup.quotaTitle,
      ...savedEvent.questions.map((q) => {
        const answer = signup.answers?.find((a) => a.questionId === q.id);
        return stringifyAnswer(answer?.answer);
      }),
      dateFormat.format(new Date(signup.createdAt)),
    ]);

    const csv = toCsv([headers, ...rows]);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${savedEvent.title ?? "signups"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [savedEvent, signups, dateFormat, t]);

  if (signups.length === 0) {
    return <p className="text-sm text-gray-500">{t("signups.noSignups")}</p>;
  }

  return (
    <div>
      <div className="mb-4">
        <Button variant="outline" size="small" onClick={handleDownloadCsv}>
          {t("signups.download")}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-3 pr-4 font-semibold text-gray-700">#</th>
              {savedEvent?.nameQuestion && (
                <>
                  <th className="pb-3 pr-4 font-semibold text-gray-700">{t("signups.firstName")}</th>
                  <th className="pb-3 pr-4 font-semibold text-gray-700">{t("signups.lastName")}</th>
                </>
              )}
              {savedEvent?.emailQuestion && (
                <th className="pb-3 pr-4 font-semibold text-gray-700">{t("signups.email")}</th>
              )}
              <th className="pb-3 pr-4 font-semibold text-gray-700">{t("signups.quota")}</th>
              <th className="pb-3 pr-4 font-semibold text-gray-700">{t("signups.time")}</th>
              <th className="pb-3 font-semibold text-gray-700">{t("signups.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {signups.map((signup, i) => (
              <tr
                key={signup.id}
                className={`border-b border-gray-100 ${signup.deletedAt ? "text-gray-400 line-through" : ""}`}
              >
                <td className="py-2 pr-4">{i + 1}</td>
                {savedEvent?.nameQuestion && (
                  <>
                    {signup.confirmed ? (
                      <>
                        <td className="py-2 pr-4">{signup.firstName}</td>
                        <td className="py-2 pr-4">{signup.lastName}</td>
                      </>
                    ) : (
                      <td className="py-2 pr-4 italic text-gray-400" colSpan={2}>
                        {t("signups.unconfirmed")}
                      </td>
                    )}
                  </>
                )}
                {savedEvent?.emailQuestion && <td className="py-2 pr-4">{signup.email}</td>}
                <td className="py-2 pr-4">{signup.quotaTitle}</td>
                <td className="py-2 pr-4 text-gray-600">{dateFormat.format(new Date(signup.createdAt))}</td>
                <td className="py-2">
                  {!signup.deletedAt && (
                    <Button
                      variant="danger"
                      size="small"
                      onClick={async () => {
                        // eslint-disable-next-line no-alert
                        if (!window.confirm(t("signups.deleteConfirm"))) return;
                        await deleteSignupAsAdminAction({ signupId: signup.id });
                        router.refresh();
                      }}
                    >
                      {t("signups.delete")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

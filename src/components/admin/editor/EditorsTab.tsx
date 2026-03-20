"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";

import { addEventEditorAction } from "@/actions/addEventEditor";
import { removeEventEditorAction } from "@/actions/removeEventEditor";
import type { EventID, UserID } from "@/db/schema";
import { firstAmongHookErrors, isHookActionPending } from "@/lib/safeActionHook";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { inputClassName } from "@/components/ui/Field";

type Editor = { userId: UserID; email: string };

type Props = {
  eventId: EventID;
  initialEditors: Editor[];
  readOnly?: boolean;
};

export default function EditorsTab({ eventId, initialEditors, readOnly }: Props) {
  const t = useTranslations("editor.editors");
  const [editors, setEditors] = useState<Editor[]>(initialEditors);
  const [email, setEmail] = useState("");
  const lastRemoveEmailRef = useRef("");

  const {
    execute: executeRemove,
    status: removeEditorActionStatus,
    result: removeEditorResult,
    reset: resetRemoveEditor,
  } = useAction(removeEventEditorAction, {
    onSuccess: ({ input }) => {
      setEditors((prev) => prev.filter((ed) => ed.userId !== input.userId));
    },
  });

  const {
    execute: executeAdd,
    status: addEditorActionStatus,
    result: addEditorResult,
    reset: resetAddEditor,
  } = useAction(addEventEditorAction, {
    onSuccess: ({ data }) => {
      if (data) {
        setEditors((prev) => [...prev, data]);
        setEmail("");
      }
    },
  });

  const actionError = firstAmongHookErrors([
    { status: addEditorActionStatus, result: addEditorResult, fallback: t("addFailed") },
    { status: removeEditorActionStatus, result: removeEditorResult, fallback: t("removeFailed") },
  ]);

  const editorsBusy = isHookActionPending(addEditorActionStatus) || isHookActionPending(removeEditorActionStatus);

  const actionSuccess =
    addEditorActionStatus === "hasSucceeded" && addEditorResult?.data
      ? t("addSuccess", { email: addEditorResult.data.email })
      : removeEditorActionStatus === "hasSucceeded"
        ? t("removeSuccess", { email: lastRemoveEmailRef.current })
        : null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isHookActionPending(addEditorActionStatus)) return;
    resetAddEditor();
    resetRemoveEditor();
    executeAdd({ eventId, email: email.trim() });
  };

  const handleRemove = (userId: UserID, editorEmail: string) => {
    if (isHookActionPending(removeEditorActionStatus)) return;
    lastRemoveEmailRef.current = editorEmail;
    resetAddEditor();
    resetRemoveEditor();
    executeRemove({ eventId, userId });
  };

  return (
    <div className="space-y-4 py-4">
      {!readOnly && <p className="text-sm text-gray-600">{t("info")}</p>}

      {actionError && <Alert variant="danger">{actionError}</Alert>}
      {actionSuccess && <Alert variant="success">{actionSuccess}</Alert>}

      {editors.length > 0 ? (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-3 pr-4 font-semibold text-gray-700">{t("email")}</th>
              {!readOnly && <th className="pb-3 font-semibold text-gray-700">{t("actions")}</th>}
            </tr>
          </thead>
          <tbody>
            {editors.map((editor) => (
              <tr key={editor.userId} className="border-b border-gray-100">
                <td className="py-3 pr-4">{editor.email}</td>
                {!readOnly && (
                  <td className="py-3">
                    <Button
                      variant="danger"
                      size="small"
                      disabled={editorsBusy}
                      actionStatus={removeEditorActionStatus}
                      onClick={() => handleRemove(editor.userId, editor.email)}
                    >
                      {t("remove")}
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-gray-500">{t("noEditors")}</p>
      )}

      {!readOnly && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="email"
            className={`${inputClassName} max-w-xs`}
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={editorsBusy} actionStatus={addEditorActionStatus}>
            {t("add")}
          </Button>
        </form>
      )}
    </div>
  );
}

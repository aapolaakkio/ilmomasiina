"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import { addEventEditorAction } from "@/actions/addEventEditor";
import { removeEventEditorAction } from "@/actions/removeEventEditor";
import type { EventID, UserID } from "@/db/schema";
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
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAdd = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim() || processing) return;
      setError(null);
      setSuccess(null);
      setProcessing(true);
      try {
        const result = await addEventEditorAction({
          eventId,
          email: email.trim(),
        });
        if (result?.serverError) {
          setError(result.serverError);
        } else if (result?.data) {
          const data = result.data;
          setEditors((prev) => [...prev, data]);
          setEmail("");
          setSuccess(t("addSuccess", { email: email.trim() }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("addFailed"));
      } finally {
        setProcessing(false);
      }
    },
    [eventId, email, processing, t],
  );

  const handleRemove = useCallback(
    async (userId: UserID, editorEmail: string) => {
      if (processing) return;
      setError(null);
      setSuccess(null);
      setProcessing(true);
      try {
        const result = await removeEventEditorAction({ eventId, userId });
        if (result?.serverError) {
          setError(result.serverError);
        } else {
          setEditors((prev) => prev.filter((ed) => ed.userId !== userId));
          setSuccess(t("removeSuccess", { email: editorEmail }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("removeFailed"));
      } finally {
        setProcessing(false);
      }
    },
    [eventId, processing, t],
  );

  return (
    <div className="space-y-4 py-4">
      {!readOnly && <p className="text-sm text-gray-600">{t("info")}</p>}

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

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
                      disabled={processing}
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
          <Button type="submit" variant="secondary" disabled={processing}>
            {t("add")}
          </Button>
        </form>
      )}
    </div>
  );
}

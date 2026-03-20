"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";

import { createSignupAsAdminAction } from "@/actions/createSignupAsAdmin";
import { updateSignupAsAdminAction } from "@/actions/updateSignupAsAdmin";
import { type QuestionID, ManualPaymentStatus, QuestionType } from "@/db/schema";
import type { AdminEventResponse, AdminSignupSchema } from "@/db/zod";
import { firstAmongHookErrors } from "@/lib/safeActionHook";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName, selectClassName } from "@/components/ui/Field";

import { isSaveErrorResult } from "./saveResultHelpers";

type Props = {
  event: AdminEventResponse;
  signup?: AdminSignupSchema;
  onClose: () => void;
  onSave: () => Promise<void>;
};

export default function EditSignupModal({ event, signup, onClose, onSave }: Props) {
  const t = useTranslations("editor.signups.editModal");
  const tFields = useTranslations("editSignup.fields");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const isCreate = !signup;

  function buildEmptyAnswers(existingSignup?: AdminSignupSchema): Record<string, string | string[]> {
    const map: Record<string, string | string[]> = {};
    for (const q of event.questions) {
      const existing = existingSignup?.answers?.find((a) => a.questionId === q.id);
      map[q.id] = existing ? existing.answer : q.type === QuestionType.CHECKBOX ? [] : "";
    }
    return map;
  }

  const [quotaId, setQuotaId] = useState<string>(event.quotas[0]?.id ?? "");
  const [firstName, setFirstName] = useState(signup?.firstName ?? "");
  const [lastName, setLastName] = useState(signup?.lastName ?? "");
  const [email, setEmail] = useState(signup?.email ?? "");
  const [language, setLanguage] = useState(event.defaultLanguage);
  const [namePublic, setNamePublic] = useState(signup?.namePublic ?? false);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(() => buildEmptyAnswers(signup));
  const [manualPaymentStatus, setManualPaymentStatus] = useState<ManualPaymentStatus | null>(
    signup?.manualPaymentStatus ?? null,
  );
  const [sendEmail, setSendEmail] = useState(true);
  const [keepEditing, setKeepEditing] = useState(false);

  const {
    executeAsync: runCreateSignup,
    status: createSignupModalStatus,
    result: createSignupModalResult,
    reset: resetCreateSignup,
  } = useAction(createSignupAsAdminAction);
  const {
    executeAsync: runUpdateSignup,
    status: updateSignupModalStatus,
    result: updateSignupModalResult,
    reset: resetUpdateSignup,
  } = useAction(updateSignupAsAdminAction);

  const activeSaveStatus = isCreate ? createSignupModalStatus : updateSignupModalStatus;
  const activeSaveResult = isCreate ? createSignupModalResult : updateSignupModalResult;
  const modalActionError = firstAmongHookErrors([
    { status: activeSaveStatus, result: activeSaveResult, fallback: t("saveFailed") },
  ]);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      onClose();
    }
  }

  function setAnswer(questionId: QuestionID, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function toggleCheckbox(questionId: QuestionID, option: string, checked: boolean) {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      if (!Array.isArray(current)) {
        return { ...prev, [questionId]: [] };
      }
      return {
        ...prev,
        [questionId]: checked ? [...current, option] : current.filter((o) => o !== option),
      };
    });
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    resetCreateSignup();
    resetUpdateSignup();

    const body = {
      firstName: event.nameQuestion ? firstName : null,
      lastName: event.nameQuestion ? lastName : null,
      email: event.emailQuestion ? email : null,
      namePublic,
      language,
      answers: event.questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] ?? "",
      })),
      manualPaymentStatus: event.payments !== "disabled" && manualPaymentStatus !== null ? manualPaymentStatus : null,
      sendEmail,
    };

    try {
      const result = isCreate
        ? await runCreateSignup({ quotaId, ...body })
        : await runUpdateSignup({ signupId: signup!.id, body });

      if (isSaveErrorResult(result)) {
        return;
      }

      await onSave();
      if (isCreate && keepEditing) {
        setFirstName("");
        setLastName("");
        setEmail("");
        setAnswers(buildEmptyAnswers());
        return;
      }
      onClose();
    } catch {
      /* Hook records failure via `status` / `result` when the action rejects. */
    }
  }

  const availableLanguages = [
    event.defaultLanguage,
    ...Object.keys(event.languages).filter((l) => l !== event.defaultLanguage),
  ];

  return (
    <dialog
      ref={dialogRef}
      className="mx-auto mt-16 w-full max-w-2xl rounded-lg p-6 backdrop:bg-black/50"
      onClick={handleBackdropClick}
    >
      <h2 className="mb-4 text-lg font-semibold">{isCreate ? t("titleCreate") : t("titleEdit")}</h2>

      {modalActionError && (
        <Alert variant="danger" className="mb-4">
          {modalActionError}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        {isCreate && (
          <Field.Root>
            <Field.Label>{t("quota")}</Field.Label>
            <select className={selectClassName} value={quotaId} onChange={(e) => setQuotaId(e.target.value)}>
              {event.quotas.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title}
                </option>
              ))}
            </select>
          </Field.Root>
        )}

        {event.nameQuestion && (
          <>
            <Field.Root>
              <Field.Label>{tFields("firstName")}</Field.Label>
              <input
                type="text"
                className={inputClassName}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>{tFields("lastName")}</Field.Label>
              <input
                type="text"
                className={inputClassName}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </Field.Root>
          </>
        )}

        {event.emailQuestion && (
          <Field.Root>
            <Field.Label>{tFields("email")}</Field.Label>
            <input type="email" className={inputClassName} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field.Root>
        )}

        <Field.Root>
          <Field.Label>{t("language")}</Field.Label>
          <select className={selectClassName} value={language} onChange={(e) => setLanguage(e.target.value)}>
            {availableLanguages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Field.Root>

        <Field.Root>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-brand-600"
              checked={namePublic}
              onChange={(e) => setNamePublic(e.target.checked)}
            />
            {t("namePublic")}
          </label>
        </Field.Root>

        {event.questions.map((question) => (
          <Field.Root key={question.id}>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {question.question}
              {question.required && <span className="text-red-600"> *</span>}
            </label>
            {question.type === QuestionType.TEXT && (
              <input
                type="text"
                className={inputClassName}
                value={answers[question.id] ?? ""}
                onChange={(e) => setAnswer(question.id, e.target.value)}
              />
            )}
            {question.type === QuestionType.NUMBER && (
              <input
                type="number"
                className={inputClassName}
                value={answers[question.id] ?? ""}
                onChange={(e) => setAnswer(question.id, e.target.value)}
              />
            )}
            {question.type === QuestionType.TEXT_AREA && (
              <textarea
                className={inputClassName}
                rows={3}
                value={answers[question.id] ?? ""}
                onChange={(e) => setAnswer(question.id, e.target.value)}
              />
            )}
            {question.type === QuestionType.SELECT &&
              question.options &&
              (question.options.length <= 3 ? (
                <div className="space-y-1">
                  {question.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`q-${question.id}`}
                        className="h-4 w-4 border-gray-300 text-brand-600"
                        checked={answers[question.id] === opt}
                        onChange={() => setAnswer(question.id, opt)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <select
                  className={selectClassName}
                  value={answers[question.id] ?? ""}
                  onChange={(e) => setAnswer(question.id, e.target.value)}
                >
                  <option value="">{tFields("selectPlaceholder")}</option>
                  {question.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ))}
            {question.type === QuestionType.CHECKBOX &&
              question.options?.map((opt) => (
                <div key={opt} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-brand-600"
                    checked={Array.isArray(answers[question.id]) && answers[question.id].includes(opt)}
                    onChange={(e) => toggleCheckbox(question.id, opt, e.target.checked)}
                  />
                  <span className="text-sm text-gray-700">{opt}</span>
                </div>
              ))}
          </Field.Root>
        ))}

        {event.payments !== "disabled" && (
          <Field.Root>
            <Field.Label>{t("manualPaymentStatus")}</Field.Label>
            <select
              className={selectClassName}
              value={manualPaymentStatus ?? ""}
              onChange={(e) => setManualPaymentStatus(e.target.value as ManualPaymentStatus)}
            >
              <option value="none">{t("manualPaymentNone")}</option>
              <option value="paid">{t("manualPaymentPaid")}</option>
              <option value="refunded">{t("manualPaymentRefunded")}</option>
            </select>
          </Field.Root>
        )}

        <Field.Root>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-brand-600"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
            {t("sendEmail")}
          </label>
        </Field.Root>

        {isCreate && (
          <Field.Root>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-brand-600"
                checked={keepEditing}
                onChange={(e) => setKeepEditing(e.target.checked)}
              />
              {t("keepEditing")}
            </label>
          </Field.Root>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button type="submit" actionStatus={activeSaveStatus}>
            {t("save")}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

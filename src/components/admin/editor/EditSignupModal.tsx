"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { Controller, useForm } from "react-hook-form";

import { createSignupAsAdminAction } from "@/actions/createSignupAsAdmin";
import { updateSignupAsAdminAction } from "@/actions/updateSignupAsAdmin";
import { type QuestionID, ManualPaymentStatus, QuestionType } from "@/db/schema";
import type { AdminEventResponse, AdminSignupSchema } from "@/db/zod";
import { firstAmongHookErrors } from "@/lib/safeActionHook";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { Field, inputClassName, selectClassName } from "@/components/ui/Field";
import { QuestionField } from "@/components/QuestionField";

import { isSaveErrorResult } from "./saveResultHelpers";

type Props = {
  event: AdminEventResponse;
  signup?: AdminSignupSchema;
  onClose: () => void;
  onSave: () => Promise<void>;
};

type ModalFormValues = {
  quotaId: string;
  firstName: string;
  lastName: string;
  email: string;
  language: string;
  namePublic: boolean;
  answers: Record<QuestionID, string | string[]>;
  manualPaymentStatus: ManualPaymentStatus;
  sendEmail: boolean;
  keepEditing: boolean;
};

function buildDefaults(event: AdminEventResponse, signup?: AdminSignupSchema) {
  const answers: Record<string, string | string[]> = {};
  for (const q of event.questions) {
    const existing = signup?.answers?.find((a) => a.questionId === q.id);
    answers[q.id] = existing ? existing.answer : q.type === QuestionType.CHECKBOX ? [] : "";
  }
  return {
    quotaId: event.quotas[0]?.id ?? "",
    firstName: signup?.firstName ?? "",
    lastName: signup?.lastName ?? "",
    email: signup?.email ?? "",
    language: event.defaultLanguage,
    namePublic: signup?.namePublic ?? false,
    answers,
    manualPaymentStatus: signup?.manualPaymentStatus ?? ManualPaymentStatus.NONE,
    sendEmail: true,
    keepEditing: false,
  };
}

export default function EditSignupModal({ event, signup, onClose, onSave }: Props) {
  const t = useTranslations("editor.signups.editModal");
  const tFields = useTranslations("editSignup.fields");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const isCreate = !signup;

  const { register, control, handleSubmit, reset } = useForm<ModalFormValues>({
    defaultValues: buildDefaults(event, signup),
  });

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

  const onSubmit = handleSubmit(async (values) => {
    resetCreateSignup();
    resetUpdateSignup();

    const body = {
      firstName: event.nameQuestion ? values.firstName : null,
      lastName: event.nameQuestion ? values.lastName : null,
      email: event.emailQuestion ? values.email : null,
      namePublic: values.namePublic,
      language: values.language,
      answers: event.questions.map((q) => ({
        questionId: q.id,
        answer: values.answers[q.id] ?? "",
      })),
      manualPaymentStatus:
        event.payments !== "disabled" && values.manualPaymentStatus !== "none"
          ? (values.manualPaymentStatus as ManualPaymentStatus)
          : null,
      sendEmail: values.sendEmail,
    };

    try {
      const result = isCreate
        ? await runCreateSignup({ quotaId: values.quotaId, ...body })
        : await runUpdateSignup({ signupId: signup!.id, body });

      if (isSaveErrorResult(result)) return;

      await onSave();
      if (isCreate && values.keepEditing) {
        reset(buildDefaults(event));
        return;
      }
      onClose();
    } catch {
      /* Hook records failure via `status` / `result` when the action rejects. */
    }
  });

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

      <form onSubmit={onSubmit}>
        {isCreate && (
          <Field.Root>
            <Field.Label>{t("quota")}</Field.Label>
            <select className={selectClassName} {...register("quotaId")}>
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
              <input type="text" className={inputClassName} {...register("firstName")} />
            </Field.Root>
            <Field.Root>
              <Field.Label>{tFields("lastName")}</Field.Label>
              <input type="text" className={inputClassName} {...register("lastName")} />
            </Field.Root>
          </>
        )}

        {event.emailQuestion && (
          <Field.Root>
            <Field.Label>{tFields("email")}</Field.Label>
            <input type="email" className={inputClassName} {...register("email")} />
          </Field.Root>
        )}

        <Field.Root>
          <Field.Label>{t("language")}</Field.Label>
          <select className={selectClassName} {...register("language")}>
            {availableLanguages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Field.Root>

        <Controller
          name="namePublic"
          control={control}
          render={({ field }) => (
            <CheckboxField
              id="modal-namePublic"
              label={t("namePublic")}
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />

        {event.questions.map((question) => (
          <Controller
            key={question.id}
            name={`answers.${question.id}`}
            control={control}
            render={({ field }) => (
              <QuestionField
                question={question}
                fieldId={`modal-q-${question.id}`}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        ))}

        {event.payments !== "disabled" && (
          <Field.Root>
            <Field.Label>{t("manualPaymentStatus")}</Field.Label>
            <select className={selectClassName} {...register("manualPaymentStatus")}>
              <option value="none">{t("manualPaymentNone")}</option>
              <option value="paid">{t("manualPaymentPaid")}</option>
              <option value="refunded">{t("manualPaymentRefunded")}</option>
            </select>
          </Field.Root>
        )}

        <Controller
          name="sendEmail"
          control={control}
          render={({ field }) => (
            <CheckboxField
              id="modal-sendEmail"
              label={t("sendEmail")}
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />

        {isCreate && (
          <Controller
            name="keepEditing"
            control={control}
            render={({ field }) => (
              <CheckboxField
                id="modal-keepEditing"
                label={t("keepEditing")}
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />
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

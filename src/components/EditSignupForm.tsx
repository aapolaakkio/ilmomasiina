"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAction, type HookActionStatus } from "next-safe-action/hooks";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { deleteSignupAction } from "@/actions/deleteSignup";
import { startPaymentAction } from "@/actions/startPayment";
import { updateSignupAction } from "@/actions/updateSignup";
import { Link, useRouter } from "@/i18n/navigation";
import { SignupPaymentStatus, SignupStatus } from "@/db/schema";
import {
  signupAnswerChoiceList,
  signupAnswerTextMax,
  signupFormEmail,
  signupPersonNameRequired,
  type SignupForEditResponse,
} from "@/db/zod";
import { firstAmongHookErrors, isHookActionPending } from "@/lib/safeActionHook";
import { useCountdown } from "@/lib/useCountdown";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { Field, inputClassName } from "@/components/ui/Field";
import { FieldError } from "@/components/ui/FieldError";
import { QuestionField } from "@/components/QuestionField";

type Props = {
  data: SignupForEditResponse;
  editToken: string;
};

type FormValues = Record<string, any>;

function signupToFormValues(signup: SignupForEditResponse["signup"], event: SignupForEditResponse["event"]) {
  const values: FormValues = {
    firstName: signup.firstName ?? "",
    lastName: signup.lastName ?? "",
    email: signup.email ?? "",
    namePublic: signup.namePublic ?? false,
  };
  for (const q of event.questions) {
    values[`answer_${q.id}`] = q.type === "checkbox" ? [] : "";
  }
  for (const answer of signup.answers ?? []) {
    values[`answer_${answer.questionId}`] = answer.answer;
  }
  return values;
}

function formValuesToUpdate(values: FormValues, event: SignupForEditResponse["event"]) {
  return {
    firstName: values.firstName || undefined,
    lastName: values.lastName || undefined,
    email: values.email || undefined,
    namePublic: !!values.namePublic,
    answers: event.questions.map((q) => ({
      questionId: q.id,
      answer: values[`answer_${q.id}`] ?? "",
    })),
  };
}

function buildSignupSchema(event: SignupForEditResponse["event"]) {
  const shape: Record<string, z.ZodType> = {};
  if (event.nameQuestion) {
    shape.firstName = signupPersonNameRequired;
    shape.lastName = signupPersonNameRequired;
  }
  if (event.emailQuestion) {
    shape.email = signupFormEmail;
  }
  for (const q of event.questions) {
    const fieldName = `answer_${q.id}`;
    if (q.type === "checkbox") {
      shape[fieldName] = q.required ? signupAnswerChoiceList.min(1) : signupAnswerChoiceList;
    } else if (q.type === "number") {
      const base = q.required ? signupAnswerTextMax.min(1) : signupAnswerTextMax;
      shape[fieldName] = base.refine((v) => v === "" || !Number.isNaN(Number(v)), { message: "notANumber" });
    } else {
      shape[fieldName] = q.required ? signupAnswerTextMax.min(1) : signupAnswerTextMax;
    }
  }
  return z.object(shape);
}

function translateFieldError(msg: string | undefined, t: (key: string) => string) {
  if (!msg) return undefined;
  if (msg === "notANumber") return t("fieldError.notANumber");
  if (/email/i.test(msg)) return t("fieldError.invalidEmail");
  if (/too.*big|at most|maximum|too long/i.test(msg)) return t("fieldError.tooLong");
  return t("fieldError.missing");
}

function DeleteConfirmButton({
  onDelete,
  disabled,
  actionStatus,
}: {
  onDelete: () => void;
  disabled: boolean;
  actionStatus: HookActionStatus;
}) {
  const t = useTranslations("editSignup");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return undefined;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <Button
      variant={confirming ? "danger" : "outline"}
      disabled={disabled}
      actionStatus={actionStatus}
      onClick={() => {
        if (confirming) {
          onDelete();
        } else {
          setConfirming(true);
        }
      }}
    >
      {confirming ? t("delete.confirm") : t("delete.action")}
    </Button>
  );
}

export default function EditSignupForm({ data, editToken }: Props) {
  const router = useRouter();
  const t = useTranslations("editSignup");
  const tDuration = useTranslations("duration");
  const { signup, event } = data;

  const {
    register,
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(buildSignupSchema(event)),
    defaultValues: signupToFormValues(signup, event),
  });

  const isNew = !signup.confirmed;
  const editableForMillis = signup.editableForMillis ?? 0;
  const confirmableForMillis = signup.confirmableForMillis ?? 0;
  const canEdit = editableForMillis > 0 || confirmableForMillis > 0;
  const alreadyPaid = signup.paymentStatus === SignupPaymentStatus.PAID;
  const showPayment = (signup.price ?? 0) > 0;
  const isInQuota = signup.status === SignupStatus.IN_QUOTA || signup.status === SignupStatus.IN_OPEN_QUOTA;
  const canPayOnline = event.payments === "online" && signup.paymentStatus === SignupPaymentStatus.PENDING;

  const {
    execute: executeUpdate,
    status: updateSignupActionStatus,
    result: updateSignupResult,
    reset: resetUpdateSignup,
  } = useAction(updateSignupAction, {
    onSuccess: () => {
      if (isNew && !showPayment) router.push(`/event/${event.slug}`);
    },
  });

  const {
    execute: executeDelete,
    status: deleteSignupActionStatus,
    result: deleteSignupResult,
    reset: resetDeleteSignup,
  } = useAction(deleteSignupAction, {
    onSuccess: () => {
      router.push(`/event/${event.slug}`);
    },
  });

  const {
    execute: executePay,
    status: payActionStatus,
    result: paySignupResult,
    reset: resetPaySignup,
  } = useAction(startPaymentAction, {
    onSuccess: ({ data }) => {
      if (data?.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    },
  });

  function resetAllSignupActions() {
    resetUpdateSignup();
    resetDeleteSignup();
    resetPaySignup();
  }

  const actionError = firstAmongHookErrors([
    { status: updateSignupActionStatus, result: updateSignupResult, fallback: t("signupError.failed") },
    { status: deleteSignupActionStatus, result: deleteSignupResult, fallback: t("deleteError.failed") },
    { status: payActionStatus, result: paySignupResult, fallback: t("paymentError.failed") },
  ]);

  const actionBusy =
    isHookActionPending(updateSignupActionStatus) ||
    isHookActionPending(deleteSignupActionStatus) ||
    isHookActionPending(payActionStatus);

  const timeLeft = useCountdown(isNew ? confirmableForMillis : canEdit ? editableForMillis : 0);

  const formatDuration = (ms: number) => {
    const sec = ms / 1000;
    if (sec < 120) return tDuration("seconds", { count: Math.floor(sec) });
    if (sec < 3600 + 60 - 1) return tDuration("minutes", { count: Math.floor(sec / 60) });
    if (sec < 86400 + 3600 - 1) return tDuration("hours", { count: Math.floor(sec / 3600) });
    return tDuration("days", { count: Math.floor(sec / 86400) });
  };

  const onSubmit = handleSubmit(() => {
    if (!canEdit || actionBusy) return;
    resetAllSignupActions();
    executeUpdate({
      signupId: signup.id,
      editToken,
      body: formValuesToUpdate(getValues(), event),
    });
  });

  const handleDelete = () => {
    resetAllSignupActions();
    executeDelete({ signupId: signup.id, editToken });
  };

  const handlePay = () => {
    resetAllSignupActions();
    executePay({ signupId: signup.id, editToken });
  };

  const positionText = (() => {
    if (signup.status === SignupStatus.IN_QUOTA) {
      return t("position.quota", { quota: signup.quota?.title ?? "", position: signup.position ?? 0 });
    }
    if (signup.status === SignupStatus.IN_OPEN_QUOTA) {
      return t("position.openQuota", { position: signup.position ?? 0 });
    }
    if (signup.status === SignupStatus.IN_QUEUE) {
      return t("position.queue", { position: signup.position ?? 0 });
    }
    return null;
  })();

  const err = (field: string) => translateFieldError(errors[field]?.message as string, t);

  return (
    <div className="mx-auto max-w-xl">
      {showPayment && (
        <section className="mb-6">
          <h2 className="mb-3 text-xl font-bold">{t("payment.title")}</h2>
          {signup.paymentStatus === SignupPaymentStatus.PAID && (
            <Alert variant="success" className="mb-3">
              {t("payment.statusPaid")}
            </Alert>
          )}
          {signup.paymentStatus === SignupPaymentStatus.PENDING && isInQuota && (
            <Alert variant="info" className="mb-3">
              {t("payment.statusPending")}
            </Alert>
          )}
          {signup.paymentStatus === SignupPaymentStatus.PENDING && !isInQuota && (
            <Alert variant="info" className="mb-3">
              {t("payment.statusPendingInQueue")}
            </Alert>
          )}
          {signup.paymentStatus === SignupPaymentStatus.REFUNDED && (
            <Alert variant="info" className="mb-3">
              {t("payment.statusRefunded")}
            </Alert>
          )}
          <table className="mb-3 w-full text-left text-sm">
            <tbody>
              {signup.products?.map((product) => (
                <tr key={product.name} className="border-b border-gray-100">
                  <td className="py-2 pr-4">{product.amount}&times;</td>
                  <td className="py-2 pr-4">{product.name}</td>
                  <td className="py-2">
                    {(product.unitPrice / 100).toFixed(2)} {signup.currency}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-300 font-semibold">
                <td colSpan={2} className="py-2 pr-4">
                  {t("payment.total")}
                </td>
                <td className="py-2">
                  {((signup.price ?? 0) / 100).toFixed(2)} {signup.currency}
                </td>
              </tr>
            </tfoot>
          </table>
          {canPayOnline && isInQuota && (
            <Button variant="primary" onClick={handlePay} disabled={actionBusy} actionStatus={payActionStatus}>
              {t("payment.pay")}
            </Button>
          )}
        </section>
      )}

      <h2 className="mb-3 text-xl font-bold">
        {(() => {
          if (!canEdit) return t("titleView");
          return isNew ? t("titleSignup") : t("titleEdit");
        })()}
      </h2>

      {positionText && <p className="mb-3 text-sm text-gray-600">{positionText}</p>}

      {canEdit && !alreadyPaid && (
        <p className={`mb-3 text-sm ${isNew && timeLeft < 5 * 60 * 1000 ? "text-red-600" : "text-gray-600"}`}>
          {isNew
            ? t("editable.unconfirmed", { duration: formatDuration(timeLeft) })
            : t("editable.confirmed", { duration: formatDuration(timeLeft) })}
        </p>
      )}
      {!canEdit && <p className="mb-3 text-sm text-gray-500">{t("editable.closed")}</p>}

      {actionError && (
        <Alert variant="danger" className="mb-4">
          {actionError}
        </Alert>
      )}

      <form onSubmit={onSubmit}>
        {event.nameQuestion && (
          <>
            <Field.Root>
              <Field.Label htmlFor="signup-firstName">
                {t("fields.firstName")}
                <span className="text-red-600"> *</span>
              </Field.Label>
              <input
                id="signup-firstName"
                type="text"
                className={inputClassName}
                disabled={!canEdit || (!isNew && signup.confirmed)}
                {...register("firstName")}
              />
              <FieldError error={err("firstName")} />
            </Field.Root>
            <Field.Root>
              <Field.Label htmlFor="signup-lastName">
                {t("fields.lastName")}
                <span className="text-red-600"> *</span>
              </Field.Label>
              <input
                id="signup-lastName"
                type="text"
                className={inputClassName}
                disabled={!canEdit || (!isNew && signup.confirmed)}
                {...register("lastName")}
              />
              <FieldError error={err("lastName")} />
            </Field.Root>
            <Controller
              name="namePublic"
              control={control}
              render={({ field }) => (
                <CheckboxField
                  id="namePublic"
                  label={t("fields.namePublic")}
                  checked={!!field.value}
                  onChange={field.onChange}
                  disabled={!canEdit}
                />
              )}
            />
          </>
        )}

        {event.emailQuestion && (
          <Field.Root>
            <Field.Label htmlFor="signup-email">
              {t("fields.email")}
              <span className="text-red-600"> *</span>
            </Field.Label>
            <input
              id="signup-email"
              type="email"
              className={inputClassName}
              disabled={!canEdit || (!isNew && signup.confirmed)}
              {...register("email")}
            />
            <FieldError error={err("email")} />
          </Field.Root>
        )}

        {event.questions.map((question) => {
          const fieldName = `answer_${question.id}`;
          const disabled = !canEdit || (alreadyPaid && (question.prices?.some((p) => p > 0) ?? false));

          return (
            <Controller
              key={question.id}
              name={fieldName}
              control={control}
              render={({ field, fieldState }) => (
                <QuestionField
                  question={question}
                  fieldId={fieldName}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                  showPrices
                  showPublic
                  error={translateFieldError(fieldState.error?.message, t)}
                />
              )}
            />
          );
        })}

        {canEdit && (
          <p className="mb-4 text-sm text-gray-600">
            {t("editInstructions")}
            {event.emailQuestion && " " + t("editInstructionsEmail")}
          </p>
        )}
        <nav className="flex justify-end gap-2">
          {!isNew && (
            <Link href={`/event/${event.slug}`}>
              <Button variant="ghost">{t("back")}</Button>
            </Link>
          )}
          {canEdit && (
            <Button type="submit" variant="primary" disabled={actionBusy} actionStatus={updateSignupActionStatus}>
              {isNew ? t("save") : t("update")}
            </Button>
          )}
        </nav>
      </form>

      {canEdit && !isNew && (
        <div className="mt-8 border-t border-gray-200 pt-4 text-center">
          <p className="mb-3 text-sm text-gray-500">{t("delete.warning")}</p>
          <DeleteConfirmButton onDelete={handleDelete} disabled={actionBusy} actionStatus={deleteSignupActionStatus} />
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";

import { deleteSignupAction } from "@/actions/deleteSignup";
import { startPaymentAction } from "@/actions/startPayment";
import { updateSignupAction } from "@/actions/updateSignup";
import { Link, useRouter } from "@/i18n/navigation";
import { SignupPaymentStatus, SignupStatus } from "@/db/schema";
import type { SignupForEditResponse, SignupUpdateBody } from "@/db/zod";
import { useFormValidation } from "@/lib/useFormValidation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName, selectClassName } from "@/components/ui/Field";
import { FieldError } from "@/components/ui/FieldError";

type Props = {
  data: SignupForEditResponse;
  editToken: string;
};

type FormValues = {
  firstName?: string;
  lastName?: string;
  email?: string;
  namePublic?: string;
} & Record<`answer_${string}`, string | string[] | undefined>;

function signupToFormValues(signup: SignupForEditResponse["signup"]): FormValues {
  const values: FormValues = {};
  if (signup.firstName) values.firstName = signup.firstName;
  if (signup.lastName) values.lastName = signup.lastName;
  if (signup.email) values.email = signup.email;
  values.namePublic = signup.namePublic ? "true" : "";
  for (const answer of signup.answers ?? []) {
    values[`answer_${answer.questionId}`] = answer.answer;
  }
  return values;
}

function formValuesToUpdate(values: FormValues, event: SignupForEditResponse["event"]): SignupUpdateBody {
  return {
    firstName: values.firstName || undefined,
    lastName: values.lastName || undefined,
    email: values.email || undefined,
    namePublic: values.namePublic === "true",
    answers: event.questions.map((q) => ({
      questionId: q.id,
      answer: values[`answer_${q.id}`] ?? "",
    })),
  };
}

function buildSignupSchema(event: SignupForEditResponse["event"]) {
  const shape: Record<string, z.ZodType> = {};
  if (event.nameQuestion) {
    shape.firstName = z.string().min(1).max(255);
    shape.lastName = z.string().min(1).max(255);
  }
  if (event.emailQuestion) {
    shape.email = z.email().max(255);
  }
  for (const q of event.questions) {
    const fieldName = `answer_${q.id}`;
    if (q.type === "checkbox") {
      shape[fieldName] = q.required ? z.array(z.string().max(255)).min(1) : z.array(z.string().max(255));
    } else if (q.type === "number") {
      const base = q.required ? z.string().min(1).max(255) : z.string().max(255);
      shape[fieldName] = base.refine((v) => v === "" || !Number.isNaN(Number(v)), { message: "notANumber" });
    } else {
      // text, textarea, select
      shape[fieldName] = q.required ? z.string().min(1).max(255) : z.string().max(255);
    }
  }
  return z.object(shape);
}

function DeleteConfirmButton({ onDelete, disabled }: { onDelete: () => void; disabled: boolean }) {
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
  const [values, setValues] = useState<FormValues>(() => signupToFormValues(signup));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fieldErrors, validate, clearError } = useFormValidation();

  const signupSchema = useMemo(() => buildSignupSchema(event), [event]);

  const isNew = !signup.confirmed;
  const editableForMillis = signup.editableForMillis ?? 0;
  const confirmableForMillis = signup.confirmableForMillis ?? 0;
  const canEdit = editableForMillis > 0 || confirmableForMillis > 0;
  const alreadyPaid = signup.paymentStatus === SignupPaymentStatus.PAID;
  const showPayment = (signup.price ?? 0) > 0;
  const isInQuota = signup.status === SignupStatus.IN_QUOTA || signup.status === SignupStatus.IN_OPEN_QUOTA;
  const canPayOnline = event.payments === "online" && signup.paymentStatus === SignupPaymentStatus.PENDING;

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState(isNew ? confirmableForMillis : editableForMillis);
  useEffect(() => {
    if (!canEdit) return undefined;
    const start = Date.now();
    const initial = isNew ? confirmableForMillis : editableForMillis;
    const timer = setInterval(() => {
      setTimeLeft(Math.max(0, initial - (Date.now() - start)));
    }, 1000);
    return () => clearInterval(timer);
  }, [canEdit, isNew, confirmableForMillis, editableForMillis]);

  const formatDuration = useCallback(
    (ms: number) => {
      const sec = ms / 1000;
      if (sec < 120) return tDuration("seconds", { count: Math.floor(sec) });
      if (sec < 3600 + 60 - 1) return tDuration("minutes", { count: Math.floor(sec / 60) });
      if (sec < 86400 + 3600 - 1) return tDuration("hours", { count: Math.floor(sec / 3600) });
      return tDuration("days", { count: Math.floor(sec / 86400) });
    },
    [tDuration],
  );

  const handleChange = useCallback(
    (field: keyof FormValues, value: string | string[]) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      clearError(field);
    },
    [clearError],
  );

  const handleCheckboxChange = useCallback(
    (field: `answer_${string}`, option: string, checked: boolean) => {
      setValues((prev) => {
        const val = prev[field];
        const current = Array.isArray(val) ? val : [];
        return {
          ...prev,
          [field]: checked ? [...current, option] : current.filter((v) => v !== option),
        };
      });
      clearError(field);
    },
    [clearError],
  );

  const mapFieldError = useCallback(
    (field: string, msg: string) => {
      if (msg === "notANumber") return t("fieldError.notANumber");
      if (/email/i.test(msg)) return t("fieldError.invalidEmail");
      if (/too.*big|at most|maximum|too long/i.test(msg)) return t("fieldError.tooLong");
      return t("fieldError.missing");
    },
    [t],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canEdit || submitting) return;
      setError(null);

      // Build validation data from form values
      const validationData: Record<string, unknown> = {};
      if (event.nameQuestion) {
        validationData.firstName = values.firstName ?? "";
        validationData.lastName = values.lastName ?? "";
      }
      if (event.emailQuestion) {
        validationData.email = values.email ?? "";
      }
      for (const q of event.questions) {
        const fieldName = `answer_${q.id}` as const;
        validationData[fieldName] = values[fieldName] ?? (q.type === "checkbox" ? [] : "");
      }

      const valid = validate(signupSchema, validationData, mapFieldError);
      if (!valid) return;

      setSubmitting(true);
      try {
        const update = formValuesToUpdate(values, event);
        const result = await updateSignupAction({
          signupId: signup.id,
          editToken,
          body: update,
        });
        if (result?.serverError) {
          setError(result.serverError);
        } else if (isNew && !showPayment) {
          router.push(`/events/${event.slug}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("signupError.failed"));
      } finally {
        setSubmitting(false);
      }
    },
    [
      canEdit,
      submitting,
      values,
      event,
      signup.id,
      editToken,
      isNew,
      showPayment,
      router,
      validate,
      signupSchema,
      mapFieldError,
      t,
    ],
  );

  const handleDelete = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await deleteSignupAction({
        signupId: signup.id,
        editToken,
      });
      if (result?.serverError) {
        setError(result.serverError);
        setSubmitting(false);
      } else {
        router.push(`/events/${event.slug}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deleteError.failed"));
      setSubmitting(false);
    }
  }, [signup.id, editToken, event.slug, router]);

  const handlePay = useCallback(async () => {
    setSubmitting(true);
    try {
      const result = await startPaymentAction({
        signupId: signup.id,
        editToken,
      });
      if (result?.data?.paymentUrl) {
        window.location.href = result.data.paymentUrl;
      } else {
        setError(result?.serverError ?? t("paymentError.failed"));
        setSubmitting(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("paymentError.failed"));
      setSubmitting(false);
    }
  }, [signup.id, editToken]);

  // Position display
  const positionText = useMemo(() => {
    if (signup.status === SignupStatus.IN_QUOTA) {
      return t("position.quota", {
        quota: signup.quota?.title ?? "",
        position: signup.position ?? 0,
      });
    }
    if (signup.status === SignupStatus.IN_OPEN_QUOTA) {
      return t("position.openQuota", { position: signup.position ?? 0 });
    }
    if (signup.status === SignupStatus.IN_QUEUE) {
      return t("position.queue", { position: signup.position ?? 0 });
    }
    return null;
  }, [signup.status, signup.position, signup.quota?.title, t]);

  return (
    <div className="mx-auto max-w-xl">
      {/* Payment section */}
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
            <Button variant="primary" onClick={handlePay} disabled={submitting}>
              {t("payment.pay")}
            </Button>
          )}
        </section>
      )}

      {/* Form title */}
      <h2 className="mb-3 text-xl font-bold">
        {(() => {
          if (!canEdit) return t("titleView");
          return isNew ? t("titleSignup") : t("titleEdit");
        })()}
      </h2>

      {/* Position */}
      {positionText && <p className="mb-3 text-sm text-gray-600">{positionText}</p>}

      {/* Editable timer */}
      {canEdit && !alreadyPaid && (
        <p className={`mb-3 text-sm ${isNew && timeLeft < 5 * 60 * 1000 ? "text-red-600" : "text-gray-600"}`}>
          {isNew
            ? t("editable.unconfirmed", { duration: formatDuration(timeLeft) })
            : t("editable.confirmed", { duration: formatDuration(timeLeft) })}
        </p>
      )}
      {!canEdit && <p className="mb-3 text-sm text-gray-500">{t("editable.closed")}</p>}

      {/* Error */}
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Name fields */}
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
                value={values.firstName ?? ""}
                onChange={(e) => handleChange("firstName", e.target.value)}
                disabled={!canEdit || (!isNew && signup.confirmed)}
              />
              <FieldError error={fieldErrors.firstName} />
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
                value={values.lastName ?? ""}
                onChange={(e) => handleChange("lastName", e.target.value)}
                disabled={!canEdit || (!isNew && signup.confirmed)}
              />
              <FieldError error={fieldErrors.lastName} />
            </Field.Root>
            <div className="mb-4 flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                id="namePublic"
                checked={values.namePublic === "true"}
                onChange={(e) => handleChange("namePublic", e.target.checked ? "true" : "")}
                disabled={!canEdit}
              />
              <label htmlFor="namePublic" className="text-sm text-gray-700">
                {t("fields.namePublic")}
              </label>
            </div>
          </>
        )}

        {/* Email */}
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
              value={values.email ?? ""}
              onChange={(e) => handleChange("email", e.target.value)}
              disabled={!canEdit || (!isNew && signup.confirmed)}
            />
            <FieldError error={fieldErrors.email} />
          </Field.Root>
        )}

        {/* Questions */}
        {event.questions.map((question) => {
          const fieldName = `answer_${question.id}` as const;
          const value = values[fieldName] ?? "";
          const stringValue = typeof value === "string" ? value : "";
          const disabled = !canEdit || (alreadyPaid && (question.prices?.some((p) => p > 0) ?? false));

          return (
            <Field.Root key={question.id}>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor={fieldName}>
                {question.question}
                {question.required && <span className="text-red-600"> *</span>}
              </label>
              {question.public && <small className="mb-1 block text-xs text-gray-500">{t("publicQuestion")}</small>}

              {question.type === "text" && (
                <input
                  id={fieldName}
                  type="text"
                  className={inputClassName}
                  value={stringValue}
                  onChange={(e) => handleChange(fieldName, e.target.value)}
                  disabled={disabled}
                />
              )}
              {question.type === "number" && (
                <input
                  id={fieldName}
                  type="number"
                  className={inputClassName}
                  value={stringValue}
                  onChange={(e) => handleChange(fieldName, e.target.value)}
                  disabled={disabled}
                />
              )}
              {question.type === "textarea" && (
                <textarea
                  id={fieldName}
                  className={inputClassName}
                  rows={3}
                  value={stringValue}
                  onChange={(e) => handleChange(fieldName, e.target.value)}
                  disabled={disabled}
                />
              )}
              {question.type === "select" &&
                question.options &&
                (question.options.length > 3 ? (
                  <select
                    id={fieldName}
                    className={selectClassName}
                    value={stringValue}
                    onChange={(e) => handleChange(fieldName, e.target.value)}
                    disabled={disabled}
                  >
                    <option value="">{t("fields.selectPlaceholder")}</option>
                    {question.options.map((opt, optIdx) => (
                      <option key={opt} value={opt}>
                        {opt}
                        {question.prices?.[optIdx] ? ` (+${(question.prices[optIdx] / 100).toFixed(2)})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  question.options.map((opt, optIdx) => (
                    <div key={opt} className="flex items-center gap-2 py-1">
                      <input
                        type="radio"
                        className="h-4 w-4 border-gray-300 text-brand-600 focus:ring-brand-500"
                        id={`${fieldName}_${opt}`}
                        name={fieldName}
                        value={opt}
                        checked={value === opt}
                        onChange={() => handleChange(fieldName, opt)}
                        disabled={disabled}
                      />
                      <label className="text-sm text-gray-700" htmlFor={`${fieldName}_${opt}`}>
                        {opt}
                        {question.prices?.[optIdx] ? ` (+${(question.prices[optIdx] / 100).toFixed(2)})` : ""}
                      </label>
                    </div>
                  ))
                ))}
              {question.type === "checkbox" &&
                question.options &&
                question.options.map((opt, optIdx) => (
                  <div key={opt} className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      id={`${fieldName}_${opt}`}
                      checked={Array.isArray(value) && value.includes(opt)}
                      onChange={(e) => handleCheckboxChange(fieldName, opt, e.target.checked)}
                      disabled={disabled}
                    />
                    <label className="text-sm text-gray-700" htmlFor={`${fieldName}_${opt}`}>
                      {opt}
                      {question.prices?.[optIdx] ? ` (+${(question.prices[optIdx] / 100).toFixed(2)})` : ""}
                    </label>
                  </div>
                ))}
              <FieldError error={fieldErrors[fieldName]} />
            </Field.Root>
          );
        })}

        {/* Instructions + Submit */}
        {canEdit && (
          <p className="mb-4 text-sm text-gray-600">
            {t("editInstructions")}
            {event.emailQuestion && " " + t("editInstructionsEmail")}
          </p>
        )}
        <nav className="flex justify-end gap-2">
          {!isNew && (
            <Link href={`/events/${event.slug}`}>
              <Button variant="ghost">{t("back")}</Button>
            </Link>
          )}
          {canEdit && (
            <Button type="submit" variant="primary" disabled={submitting} loading={submitting}>
              {isNew ? t("save") : t("update")}
            </Button>
          )}
        </nav>
      </form>

      {/* Delete */}
      {canEdit && !isNew && (
        <div className="mt-8 border-t border-gray-200 pt-4 text-center">
          <p className="mb-3 text-sm text-gray-500">{t("delete.warning")}</p>
          <DeleteConfirmButton onDelete={handleDelete} disabled={submitting} />
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import Markdown from "@/components/Markdown";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName, selectClassName } from "@/components/ui/Field";

import type { EditorFormState } from "./types";

type Props = {
  form: EditorFormState;
};

function formatDateTime(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    timeZone: "Europe/Helsinki",
  }).format(new Date(date));
}

/** Renders a read-only preview of the event as users would see it. */
export default function PreviewTab({ form }: Props) {
  const t = useTranslations("singleEvent");
  const tEdit = useTranslations("editSignup");
  const currentLocale = useLocale();
  const locale = currentLocale === "en" ? "en-FI" : "fi-FI";
  const [showSignupForm, setShowSignupForm] = useState(false);

  // Build dummy quotas for the signup button preview
  const previewQuotas = useMemo(
    () =>
      form.quotas
        .filter((q) => q.title)
        .map((q, i) => ({
          id: `preview-${i}`,
          title: q.title,
          size: q.size,
          signupCount: 0,
        })),
    [form.quotas],
  );

  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6">
      {/* Event details preview */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <h1 className="mb-4 text-2xl font-bold">{form.title || "\u2014"}</h1>
          <div className="mb-6 space-y-1 text-sm text-gray-700">
            {form.category && (
              <p>
                <span className="font-semibold">{t("category")}</span> {form.category}
              </p>
            )}
            {form.date && (
              <p>
                <span className="font-semibold">{form.endDate ? t("startDate") : t("date")}</span>{" "}
                {formatDateTime(form.date, locale)}
              </p>
            )}
            {form.endDate && (
              <p>
                <span className="font-semibold">{t("endDate")}</span> {formatDateTime(form.endDate, locale)}
              </p>
            )}
            {form.location && (
              <p>
                <span className="font-semibold">{t("location")}</span> {form.location}
              </p>
            )}
            {form.price && (
              <p>
                <span className="font-semibold">{t("price")}</span> {form.price}
              </p>
            )}
            {form.webpageUrl && (
              <p>
                <span className="font-semibold">{t("website")}</span>{" "}
                <span className="text-brand-600">{form.webpageUrl}</span>
              </p>
            )}
          </div>
          {form.description && <Markdown>{form.description}</Markdown>}
        </div>

        <div className="space-y-6">
          {/* Signup button preview */}
          <div>
            <h3 className="mb-2 text-lg font-semibold">{t("signupTitle")}</h3>
            <p className="mb-3 text-sm text-gray-600">
              {form.registrationStartDate && form.registrationEndDate ? t("signupOpen") : t("signupNotOpen")}
            </p>
            {previewQuotas.map((quota) => (
              <Button
                key={quota.id}
                variant="secondary"
                className="mb-2 w-full"
                disabled
                onClick={() => setShowSignupForm(true)}
              >
                {previewQuotas.length === 1 ? t("signupNow") : t("signupQuota", { quota: quota.title })}
              </Button>
            ))}
            {previewQuotas.length > 0 && (
              <Button
                variant="outline"
                size="small"
                className="mt-1"
                onClick={() => setShowSignupForm(!showSignupForm)}
              >
                {showSignupForm ? "\u2191 Hide signup form" : "\u2193 Preview signup form"}
              </Button>
            )}
          </div>

          {/* Quota status preview */}
          {previewQuotas.length > 0 && (
            <div>
              <h3 className="mb-3 text-lg font-semibold">{t("signupsTitle")}</h3>
              {previewQuotas.map((quota) => (
                <div key={quota.id} className="mb-3">
                  <div className="flex justify-between text-sm">
                    <span>{quota.title}</span>
                    <span className="text-gray-600">0 / {quota.size ?? t("unlimited")}</span>
                  </div>
                  {quota.size != null && (
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: "0%" }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Signup form preview */}
      {showSignupForm && (
        <div className="mt-8 border-t border-gray-300 pt-6">
          <h2 className="mb-4 text-xl font-bold">{tEdit("titleSignup")}</h2>
          <div className="mx-auto max-w-xl">
            {form.nameQuestion && (
              <>
                <Field.Root>
                  <Field.Label>{tEdit("fields.firstName")}</Field.Label>
                  <input type="text" className={inputClassName} disabled />
                </Field.Root>
                <Field.Root>
                  <Field.Label>{tEdit("fields.lastName")}</Field.Label>
                  <input type="text" className={inputClassName} disabled />
                </Field.Root>
              </>
            )}
            {form.emailQuestion && (
              <Field.Root>
                <Field.Label>{tEdit("fields.email")}</Field.Label>
                <input type="email" className={inputClassName} disabled />
              </Field.Root>
            )}
            {form.questions.map((question, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <Field.Root key={i}>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {question.question || `(Question ${i + 1})`}
                  {question.required && <span className="text-red-600"> *</span>}
                </label>
                {question.type === "text" && <input type="text" className={inputClassName} disabled />}
                {question.type === "number" && <input type="number" className={inputClassName} disabled />}
                {question.type === "textarea" && <textarea className={inputClassName} rows={3} disabled />}
                {question.type === "select" && question.options && (
                  <select className={selectClassName} disabled>
                    <option value="">{tEdit("fields.selectPlaceholder")}</option>
                    {question.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
                {question.type === "checkbox" &&
                  question.options?.map((opt) => (
                    <div key={opt} className="flex items-center gap-2 py-1">
                      <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-brand-600" disabled />
                      <span className="text-sm text-gray-700">{opt}</span>
                    </div>
                  ))}
              </Field.Root>
            ))}
            <Button variant="primary" disabled>
              {tEdit("save")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

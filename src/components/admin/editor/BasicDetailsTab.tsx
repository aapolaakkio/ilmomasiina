"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { checkSlugAction } from "@/actions/checkSlug";
import { PaymentMode } from "@/db/schema";
import { Field, inputClassName, selectClassName } from "@/components/ui/Field";
import { FieldError } from "@/components/ui/FieldError";

import LocalizedIndicator from "./LocalizedIndicator";
import type { EditorTabProps, LocalizableFields } from "./types";
import { getLocalizedValue, setLocalizedValue } from "./types";

/** Generate a URL slug from a title. */
function generateSlug(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Convert an ISO string to a local datetime-local input value (YYYY-MM-DDTHH:mm). */
function isoToLocal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert a datetime-local input value to an ISO string. */
function localToIso(value: string): string {
  if (!value) return "";
  return new Date(value).toISOString();
}

type Props = EditorTabProps & {
  categories: string[];
  eventId?: string;
  isNew?: boolean;
};

export default function BasicDetailsTab({
  form,
  updateField,
  fieldErrors,
  selectedLanguage,
  readOnly,
  categories,
  eventId,
  isNew,
}: Props) {
  const t = useTranslations("editor");
  const isDefaultLang = selectedLanguage === form.defaultLanguage || !form.languages[selectedLanguage];
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!isNew || !!form.slug);

  const getLocalized = (field: keyof LocalizableFields) => getLocalizedValue(form, field, selectedLanguage);
  const setLocalized = (field: keyof LocalizableFields, value: string) =>
    setLocalizedValue(form, updateField, field, value, selectedLanguage);

  // Slug availability checking
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const [slugConflictTitle, setSlugConflictTitle] = useState<string | null>(null);
  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkSlug = useCallback(
    async (slug: string) => {
      if (!slug || !/^[A-Za-z0-9_-]+$/.test(slug)) {
        setSlugStatus("idle");
        return;
      }
      setSlugStatus("checking");
      const result = await checkSlugAction({ slug });
      if (result?.data) {
        // If the slug is used by the current event, it's fine
        if (result.data.id && result.data.id !== eventId) {
          setSlugStatus("taken");
          setSlugConflictTitle(result.data.title);
        } else {
          setSlugStatus("free");
          setSlugConflictTitle(null);
        }
      } else {
        setSlugStatus("idle");
      }
    },
    [eventId],
  );

  const handleSlugChange = useCallback(
    (value: string) => {
      setSlugManuallyEdited(true);
      updateField("slug", value);
      setSlugStatus("idle");
      if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
      if (value && /^[A-Za-z0-9_-]+$/.test(value)) {
        slugTimerRef.current = setTimeout(() => checkSlug(value), 500);
      }
    },
    [updateField, checkSlug],
  );

  const handleTitleChange = useCallback(
    (value: string) => {
      setLocalizedValue(form, updateField, "title", value, selectedLanguage);
      if (!slugManuallyEdited && isDefaultLang) {
        const slug = generateSlug(value);
        updateField("slug", slug);
        setSlugStatus("idle");
        if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
        if (slug && /^[A-Za-z0-9_-]+$/.test(slug)) {
          slugTimerRef.current = setTimeout(() => checkSlug(slug), 500);
        }
      }
    },
    [form, slugManuallyEdited, isDefaultLang, selectedLanguage, updateField, checkSlug],
  );

  useEffect(() => {
    return () => {
      if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
    };
  }, []);

  return (
    <div>
      <Field.Root>
        <Field.Label htmlFor="editor-title">
          {t("basic.name")}
          <LocalizedIndicator />
          {isDefaultLang && <span className="ml-0.5 text-red-500">*</span>}
        </Field.Label>
        <input
          id="editor-title"
          type="text"
          className={inputClassName}
          value={getLocalized("title")}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder={!isDefaultLang ? form.title : undefined}
          disabled={readOnly}
        />
        <FieldError error={fieldErrors.title} />
      </Field.Root>
      <Field.Root>
        <Field.Label htmlFor="editor-slug">
          {t("basic.url")}
          <span className="ml-0.5 text-red-500">*</span>
        </Field.Label>
        <input
          id="editor-slug"
          type="text"
          className={inputClassName}
          value={form.slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          disabled={readOnly}
        />
        {slugStatus === "checking" && <p className="mt-1 text-sm text-gray-500">{t("basic.urlChecking")}</p>}
        {slugStatus === "free" && <p className="mt-1 text-sm text-green-600">{t("basic.urlFree")}</p>}
        {slugStatus === "taken" && (
          <p className="mt-1 text-sm text-red-600">{t("basic.urlReserved", { event: slugConflictTitle ?? "" })}</p>
        )}
        <FieldError error={fieldErrors.slug} />
      </Field.Root>
      <Field.Root>
        <Field.Label htmlFor="editor-category">{t("basic.category")}</Field.Label>
        <input
          id="editor-category"
          type="text"
          className={inputClassName}
          list="categories"
          value={form.category}
          onChange={(e) => updateField("category", e.target.value)}
          disabled={readOnly}
        />
        <datalist id="categories">
          {categories.map((c) => (
            <option key={c} value={c} aria-label={c} />
          ))}
        </datalist>
      </Field.Root>

      <div className="mb-4 space-y-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field.Root className="mb-0">
            <Field.Label htmlFor="editor-date">
              {t("basic.startDate")}
              {!form.registrationStartDate && <span className="ml-0.5 text-red-500">*</span>}
            </Field.Label>
            <input
              id="editor-date"
              type="datetime-local"
              className={inputClassName}
              value={isoToLocal(form.date)}
              onChange={(e) => updateField("date", localToIso(e.target.value))}
              disabled={readOnly}
            />
          </Field.Root>
          <Field.Root className="mb-0">
            <Field.Label htmlFor="editor-endDate">{t("basic.endDate")}</Field.Label>
            <input
              id="editor-endDate"
              type="datetime-local"
              className={inputClassName}
              value={isoToLocal(form.endDate)}
              onChange={(e) => updateField("endDate", localToIso(e.target.value))}
              disabled={readOnly}
            />
            <FieldError error={fieldErrors.dateInverted} />
            <FieldError error={fieldErrors.endDateWithoutDate} />
          </Field.Root>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field.Root className="mb-0">
            <Field.Label htmlFor="editor-regStart">
              {t("basic.registrationStart")}
              {!form.date && <span className="ml-0.5 text-red-500">*</span>}
            </Field.Label>
            <input
              id="editor-regStart"
              type="datetime-local"
              className={inputClassName}
              value={isoToLocal(form.registrationStartDate)}
              onChange={(e) => updateField("registrationStartDate", localToIso(e.target.value))}
              disabled={readOnly}
            />
          </Field.Root>
          <Field.Root className="mb-0">
            <Field.Label htmlFor="editor-regEnd">
              {t("basic.registrationEnd")}
              {!form.date && <span className="ml-0.5 text-red-500">*</span>}
            </Field.Label>
            <input
              id="editor-regEnd"
              type="datetime-local"
              className={inputClassName}
              value={isoToLocal(form.registrationEndDate)}
              onChange={(e) => updateField("registrationEndDate", localToIso(e.target.value))}
              disabled={readOnly}
            />
            <FieldError error={fieldErrors.registrationDateInverted} />
            <FieldError error={fieldErrors.registrationDateIncomplete} />
          </Field.Root>
        </div>
        <FieldError error={fieldErrors.dateMissing} />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          id="listed"
          checked={form.listed}
          onChange={(e) => updateField("listed", e.target.checked)}
          disabled={readOnly}
        />
        <label htmlFor="listed" className="text-sm text-gray-700">
          {t("basic.listed")}
        </label>
      </div>
      <div className="mb-4 flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          id="signupsPublic"
          checked={form.signupsPublic}
          onChange={(e) => updateField("signupsPublic", e.target.checked)}
          disabled={readOnly}
        />
        <label htmlFor="signupsPublic" className="text-sm text-gray-700">
          {t("basic.signupsPublic")}
        </label>
      </div>

      <Field.Root>
        <Field.Label htmlFor="editor-location">
          {t("basic.location")}
          <LocalizedIndicator />
        </Field.Label>
        <input
          id="editor-location"
          type="text"
          className={inputClassName}
          value={getLocalized("location")}
          onChange={(e) => setLocalized("location", e.target.value)}
          placeholder={!isDefaultLang ? form.location : undefined}
          disabled={readOnly}
        />
      </Field.Root>
      <Field.Root>
        <Field.Label htmlFor="editor-price">
          {t("basic.price")}
          <LocalizedIndicator />
        </Field.Label>
        <input
          id="editor-price"
          type="text"
          className={inputClassName}
          value={getLocalized("price")}
          onChange={(e) => setLocalized("price", e.target.value)}
          placeholder={!isDefaultLang ? form.price : undefined}
          disabled={readOnly}
        />
        <small className="mt-1 text-xs text-gray-500">{t("basic.priceInfo")}</small>
      </Field.Root>
      <Field.Root>
        <Field.Label htmlFor="editor-payments">{t("basic.payments")}</Field.Label>
        <select
          id="editor-payments"
          className={selectClassName}
          value={form.payments}
          onChange={(e) => updateField("payments", e.target.value as PaymentMode)}
          disabled={readOnly}
        >
          <option value={PaymentMode.DISABLED}>{t("basic.paymentsDisabled")}</option>
          <option value={PaymentMode.MANUAL}>{t("basic.paymentsManual")}</option>
          <option value={PaymentMode.ONLINE}>{t("basic.paymentsOnline")}</option>
        </select>
      </Field.Root>
      <Field.Root>
        <Field.Label htmlFor="editor-webpageUrl">
          {t("basic.website")}
          <LocalizedIndicator />
        </Field.Label>
        <input
          id="editor-webpageUrl"
          type="url"
          className={inputClassName}
          value={getLocalized("webpageUrl")}
          onChange={(e) => setLocalized("webpageUrl", e.target.value)}
          placeholder={!isDefaultLang ? form.webpageUrl : undefined}
          disabled={readOnly}
        />
      </Field.Root>
      <Field.Root>
        <Field.Label htmlFor="editor-description">
          {t("basic.description")}
          <LocalizedIndicator />
        </Field.Label>
        <textarea
          id="editor-description"
          className={inputClassName}
          rows={6}
          value={getLocalized("description")}
          onChange={(e) => setLocalized("description", e.target.value)}
          placeholder={!isDefaultLang ? form.description : undefined}
          disabled={readOnly}
        />
        <small className="mt-1 text-xs text-gray-500">{t("basic.descriptionInfo")}</small>
      </Field.Root>
    </div>
  );
}

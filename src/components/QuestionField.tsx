"use client";

import { useTranslations } from "next-intl";

import { Field, inputClassName, selectClassName } from "@/components/ui/Field";
import { FieldError } from "@/components/ui/FieldError";

export type QuestionFieldQuestion = {
  question: string;
  type: string;
  required?: boolean;
  options?: string[] | null;
  prices?: number[] | null;
  public?: boolean;
};

type Props = {
  question: QuestionFieldQuestion;
  /** Unique id for the input element (used for htmlFor). */
  fieldId: string;
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  disabled?: boolean;
  /** Whether to display prices next to options. */
  showPrices?: boolean;
  /** Show "public question" indicator. */
  showPublic?: boolean;
  error?: string;
};

export function QuestionField({
  question,
  fieldId,
  value = "",
  onChange,
  disabled,
  showPrices,
  showPublic,
  error,
}: Props) {
  const t = useTranslations("editSignup");
  const stringValue = typeof value === "string" ? value : "";

  const handleChange = (v: string) => onChange?.(v);

  const handleCheckboxToggle = (option: string, checked: boolean) => {
    const current = Array.isArray(value) ? value : [];
    onChange?.(checked ? [...current, option] : current.filter((v) => v !== option));
  };

  const priceLabel = (idx: number) => {
    if (!showPrices || !question.prices?.[idx]) return "";
    return ` (+${(question.prices[idx] / 100).toFixed(2)})`;
  };

  return (
    <Field.Root>
      <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor={fieldId}>
        {question.question}
        {question.required && <span className="text-red-600"> *</span>}
      </label>
      {showPublic && question.public && (
        <small className="mb-1 block text-xs text-gray-500">{t("publicQuestion")}</small>
      )}

      {question.type === "text" && (
        <input
          id={fieldId}
          type="text"
          className={inputClassName}
          value={stringValue}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
        />
      )}
      {question.type === "number" && (
        <input
          id={fieldId}
          type="number"
          className={inputClassName}
          value={stringValue}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
        />
      )}
      {question.type === "textarea" && (
        <textarea
          id={fieldId}
          className={inputClassName}
          rows={3}
          value={stringValue}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
        />
      )}
      {question.type === "select" &&
        question.options &&
        (question.options.length > 3 ? (
          <select
            id={fieldId}
            className={selectClassName}
            value={stringValue}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
          >
            <option value="">{t("fields.selectPlaceholder")}</option>
            {question.options.map((opt, i) => (
              <option key={opt} value={opt}>
                {opt}
                {priceLabel(i)}
              </option>
            ))}
          </select>
        ) : (
          question.options.map((opt, i) => (
            <div key={opt} className="flex items-center gap-2 py-1">
              <input
                type="radio"
                className="h-4 w-4 border-gray-300 text-brand-600 focus:ring-brand-500"
                id={`${fieldId}_${opt}`}
                name={fieldId}
                value={opt}
                checked={value === opt}
                onChange={() => handleChange(opt)}
                disabled={disabled}
              />
              <label className="text-sm text-gray-700" htmlFor={`${fieldId}_${opt}`}>
                {opt}
                {priceLabel(i)}
              </label>
            </div>
          ))
        ))}
      {question.type === "checkbox" &&
        question.options?.map((opt, i) => (
          <div key={opt} className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              id={`${fieldId}_${opt}`}
              checked={Array.isArray(value) && value.includes(opt)}
              onChange={(e) => handleCheckboxToggle(opt, e.target.checked)}
              disabled={disabled}
            />
            <label className="text-sm text-gray-700" htmlFor={`${fieldId}_${opt}`}>
              {opt}
              {priceLabel(i)}
            </label>
          </div>
        ))}

      <FieldError error={error} />
    </Field.Root>
  );
}

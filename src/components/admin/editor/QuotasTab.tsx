"use client";

import { useTranslations } from "next-intl";
import { arrayMove } from "@dnd-kit/sortable";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, inputClassName } from "@/components/ui/Field";
import { FieldError } from "@/components/ui/FieldError";
import { SortableList } from "@/components/ui/Sortable";

import LocalizedIndicator from "./LocalizedIndicator";
import { type EditorTabProps, generateKey, isDefaultLanguageView } from "./types";

export default function QuotasTab({ form, updateField, fieldErrors, selectedLanguage, readOnly }: EditorTabProps) {
  const t = useTranslations("editor");
  const isDefaultLang = isDefaultLanguageView(form, selectedLanguage);

  const getQuotaTitle = (index: number): string => {
    if (isDefaultLang) return form.quotas[index].title;
    return form.languages[selectedLanguage]?.quotas?.[index]?.title ?? "";
  };

  const setQuotaTitle = (index: number, value: string) => {
    if (isDefaultLang) {
      const quotas = [...form.quotas];
      quotas[index] = { ...quotas[index], title: value };
      updateField("quotas", quotas);
    } else {
      const lang = { ...form.languages[selectedLanguage] };
      const quotas = [...(lang.quotas ?? [])];
      quotas[index] = { title: value };
      lang.quotas = quotas;
      updateField("languages", { ...form.languages, [selectedLanguage]: lang });
    }
  };

  const handleReorder = (oldIndex: number, newIndex: number) => {
    updateField("quotas", arrayMove(form.quotas, oldIndex, newIndex));
  };

  const sortableItems = form.quotas.map((q) => ({ id: q.key }));

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          id="nameQuestion"
          checked={form.nameQuestion}
          disabled={readOnly}
          onChange={(e) => updateField("nameQuestion", e.target.checked)}
        />
        <label htmlFor="nameQuestion" className="text-sm text-gray-700">
          {t("quotas.nameQuestion")}
        </label>
      </div>
      <div className="mb-4 flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          id="emailQuestion"
          checked={form.emailQuestion}
          disabled={readOnly}
          onChange={(e) => updateField("emailQuestion", e.target.checked)}
        />
        <label htmlFor="emailQuestion" className="text-sm text-gray-700">
          {t("quotas.emailQuestion")}
        </label>
      </div>

      <h3 className="mb-3 text-lg font-semibold">{t("quotas.title")}</h3>
      {fieldErrors.quotas && <FieldError error={fieldErrors.quotas} />}

      <SortableList items={sortableItems} onReorder={handleReorder} disabled={readOnly}>
        {(item, i) => {
          const quota = form.quotas[i];
          return (
            <Card>
              <div className="flex items-start gap-2">
                <div className="flex flex-1 items-end gap-2">
                  <div className="flex-1">
                    <Field.Root className="mb-0">
                      <Field.Label htmlFor={`quota-title-${i}`}>
                        {t("quotas.quotaName")}
                        <LocalizedIndicator />
                        {isDefaultLang && <span className="ml-0.5 text-red-500">*</span>}
                      </Field.Label>
                      <input
                        id={`quota-title-${i}`}
                        type="text"
                        className={inputClassName}
                        value={getQuotaTitle(i)}
                        disabled={readOnly}
                        onChange={(e) => setQuotaTitle(i, e.target.value)}
                        placeholder={!isDefaultLang ? quota.title : undefined}
                      />
                      <FieldError error={fieldErrors[`quotas[${i}].title`]} />
                    </Field.Root>
                  </div>
                  <div className="w-[120px]">
                    <Field.Root className="mb-0">
                      <Field.Label htmlFor={`quota-size-${i}`}>{t("quotas.quotaSize")}</Field.Label>
                      <input
                        id={`quota-size-${i}`}
                        type="number"
                        className={inputClassName}
                        value={quota.size ?? ""}
                        placeholder={t("quotas.quotaSizeUnlimited")}
                        disabled={readOnly}
                        onChange={(e) => {
                          const quotas = [...form.quotas];
                          quotas[i] = { ...quota, size: e.target.value ? Number(e.target.value) : null };
                          updateField("quotas", quotas);
                        }}
                      />
                    </Field.Root>
                  </div>
                </div>
                {form.quotas.length > 1 && (
                  <Button
                    variant="danger"
                    className="mt-6 shrink-0"
                    disabled={readOnly}
                    onClick={() =>
                      updateField(
                        "quotas",
                        form.quotas.filter((_, j) => j !== i),
                      )
                    }
                  >
                    {t("quotas.deleteQuota")}
                  </Button>
                )}
              </div>
            </Card>
          );
        }}
      </SortableList>

      <Button
        variant="outline"
        size="small"
        className="mt-2"
        disabled={readOnly}
        onClick={() => updateField("quotas", [...form.quotas, { key: generateKey(), title: "", size: null, price: 0 }])}
      >
        {t("quotas.addQuota")}
      </Button>

      <div className="mt-4">
        <Field.Root>
          <Field.Label htmlFor="editor-openQuotaSize">{t("quotas.openQuotaSize")}</Field.Label>
          <input
            id="editor-openQuotaSize"
            type="number"
            className={`${inputClassName} w-[200px]`}
            value={form.openQuotaSize}
            disabled={readOnly}
            onChange={(e) => updateField("openQuotaSize", Number(e.target.value))}
          />
        </Field.Root>
      </div>
    </div>
  );
}

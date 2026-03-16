"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { arrayMove } from "@dnd-kit/sortable";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, inputClassName, selectClassName } from "@/components/ui/Field";
import { FieldError } from "@/components/ui/FieldError";
import { SortableList } from "@/components/ui/Sortable";
import { QuestionType } from "@/models";

import LocalizedIndicator from "./LocalizedIndicator";
import { type EditorTabProps, generateKey } from "./types";

export default function QuestionsTab({ form, updateField, fieldErrors, selectedLanguage, readOnly }: EditorTabProps) {
  const t = useTranslations("editor");
  const isDefaultLang = selectedLanguage === form.defaultLanguage || !form.languages[selectedLanguage];

  const getQuestionText = (index: number): string => {
    if (isDefaultLang) return form.questions[index].question;
    return form.languages[selectedLanguage]?.questions?.[index]?.question ?? "";
  };

  const setQuestionText = (index: number, value: string) => {
    if (isDefaultLang) {
      const questions = [...form.questions];
      questions[index] = { ...questions[index], question: value };
      updateField("questions", questions);
    } else {
      const lang = { ...form.languages[selectedLanguage] };
      const questions = [...(lang.questions ?? [])];
      questions[index] = { ...questions[index], question: value };
      lang.questions = questions;
      updateField("languages", { ...form.languages, [selectedLanguage]: lang });
    }
  };

  const getOptionText = (qIndex: number, oIndex: number): string => {
    if (isDefaultLang) return form.questions[qIndex].options?.[oIndex] ?? "";
    return form.languages[selectedLanguage]?.questions?.[qIndex]?.options?.[oIndex] ?? "";
  };

  const setOptionText = (qIndex: number, oIndex: number, value: string) => {
    if (isDefaultLang) {
      const questions = [...form.questions];
      const options = [...(questions[qIndex].options ?? [])];
      options[oIndex] = value;
      questions[qIndex] = { ...questions[qIndex], options };
      updateField("questions", questions);
    } else {
      const lang = { ...form.languages[selectedLanguage] };
      const questions = [...(lang.questions ?? [])];
      const options = [...(questions[qIndex]?.options ?? [])];
      options[oIndex] = value;
      questions[qIndex] = { ...questions[qIndex], options };
      lang.questions = questions;
      updateField("languages", { ...form.languages, [selectedLanguage]: lang });
    }
  };

  const handleReorder = useCallback(
    (oldIndex: number, newIndex: number) => {
      updateField("questions", arrayMove(form.questions, oldIndex, newIndex));
    },
    [form.questions, updateField],
  );

  const sortableItems = form.questions.map((q) => ({ id: q.key }));

  return (
    <div>
      <SortableList items={sortableItems} onReorder={handleReorder} disabled={readOnly}>
        {(item, i) => {
          const question = form.questions[i];
          return (
            <Card>
              <div className="mb-3 flex gap-2">
                <div className="flex-1">
                  <Field.Root className="mb-0">
                    <Field.Label htmlFor={`question-text-${i}`}>
                      {t("questions.questionText")}
                      <LocalizedIndicator />
                    </Field.Label>
                    <input
                      id={`question-text-${i}`}
                      type="text"
                      className={inputClassName}
                      value={getQuestionText(i)}
                      onChange={(e) => setQuestionText(i, e.target.value)}
                      placeholder={!isDefaultLang ? question.question : undefined}
                      disabled={readOnly}
                    />
                    <FieldError error={fieldErrors[`questions[${i}].question`]} />
                  </Field.Root>
                </div>
                <div className="w-[200px]">
                  <Field.Root className="mb-0">
                    <Field.Label htmlFor={`question-type-${i}`}>{t("questions.questionType")}</Field.Label>
                    <select
                      id={`question-type-${i}`}
                      className={selectClassName}
                      value={question.type}
                      disabled={readOnly}
                      onChange={(e) => {
                        const questions = [...form.questions];
                        questions[i] = { ...question, type: e.target.value as QuestionType };
                        updateField("questions", questions);
                      }}
                    >
                      <option value="text">{t("questions.typeText")}</option>
                      <option value="textarea">{t("questions.typeTextarea")}</option>
                      <option value="number">{t("questions.typeNumber")}</option>
                      <option value="select">{t("questions.typeSelect")}</option>
                      <option value="checkbox">{t("questions.typeCheckbox")}</option>
                    </select>
                  </Field.Root>
                </div>
              </div>

              <div className="mb-3 flex gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    id={`question-required-${i}`}
                    checked={question.required}
                    disabled={readOnly}
                    onChange={(e) => {
                      const questions = [...form.questions];
                      questions[i] = { ...question, required: e.target.checked };
                      updateField("questions", questions);
                    }}
                  />
                  <label className="text-sm text-gray-700" htmlFor={`question-required-${i}`}>
                    {t("questions.required")}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    id={`question-public-${i}`}
                    checked={question.public}
                    disabled={readOnly}
                    onChange={(e) => {
                      const questions = [...form.questions];
                      questions[i] = { ...question, public: e.target.checked };
                      updateField("questions", questions);
                    }}
                  />
                  <label className="text-sm text-gray-700" htmlFor={`question-public-${i}`}>
                    {t("questions.public")}
                  </label>
                </div>
              </div>

              {(question.type === "select" || question.type === "checkbox") && (
                <div className="mb-3">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    {t("questions.options")}
                    <LocalizedIndicator />
                  </span>
                  {(question.options ?? []).map((opt, j) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <div key={j} className="mb-1 flex gap-1">
                      <input
                        type="text"
                        className={`${inputClassName} text-sm`}
                        aria-label={`Option ${j + 1}`}
                        value={getOptionText(i, j)}
                        onChange={(e) => setOptionText(i, j, e.target.value)}
                        placeholder={!isDefaultLang ? opt : undefined}
                        disabled={readOnly}
                      />
                      <Button
                        variant="danger"
                        size="small"
                        disabled={readOnly}
                        onClick={() => {
                          const questions = [...form.questions];
                          const options = (question.options ?? []).filter((_, k) => k !== j);
                          questions[i] = { ...question, options };
                          updateField("questions", questions);
                        }}
                      >
                        &times;
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="small"
                    disabled={readOnly}
                    onClick={() => {
                      const questions = [...form.questions];
                      questions[i] = { ...question, options: [...(question.options ?? []), ""] };
                      updateField("questions", questions);
                    }}
                  >
                    {t("questions.addOption")}
                  </Button>
                </div>
              )}

              <Button
                variant="danger"
                size="small"
                disabled={readOnly}
                onClick={() =>
                  updateField(
                    "questions",
                    form.questions.filter((_, j) => j !== i),
                  )
                }
              >
                {t("questions.deleteQuestion")}
              </Button>
            </Card>
          );
        }}
      </SortableList>

      <Button
        variant="outline"
        className="mt-2"
        disabled={readOnly}
        onClick={() =>
          updateField("questions", [
            ...form.questions,
            {
              key: generateKey(),
              question: "",
              type: QuestionType.TEXT,
              required: false,
              public: false,
              options: null,
              prices: null,
            },
          ])
        }
      >
        {t("questions.addQuestion")}
      </Button>
    </div>
  );
}

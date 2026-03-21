import type { AdminEventLanguage } from "@/db/zod";

import type { EditorFormState } from "./types";

type LangQuestionRow = AdminEventLanguage["questions"][number];
type EditorQuestionRow = EditorFormState["questions"][number];

function mergeLangQuestionRow(q: EditorQuestionRow, existing: LangQuestionRow | undefined) {
  if (!existing) {
    return {
      question: "",
      options: q.options ? q.options.map(() => "") : null,
    };
  }
  if (q.options && existing.options && q.options.length !== existing.options.length) {
    return {
      ...existing,
      options: q.options.map((_, j) => existing.options?.[j] ?? ""),
    };
  }
  if (q.options && !existing.options) {
    return { ...existing, options: q.options.map(() => "") };
  }
  if (!q.options) {
    return { ...existing, options: null };
  }
  return existing;
}

/** Mirror quota row structure (count/order) in every language version. */
export function syncQuotasAcrossLanguages(
  languages: Record<string, AdminEventLanguage>,
  quotas: EditorFormState["quotas"],
): Record<string, AdminEventLanguage> {
  const out = { ...languages };
  for (const [langKey, langVersion] of Object.entries(out)) {
    out[langKey] = {
      ...langVersion,
      quotas: quotas.map((_, i) => langVersion.quotas?.[i] ?? { title: "" }),
    };
  }
  return out;
}

/** Mirror question row structure in every language version (text/options placeholders). */
export function syncQuestionsAcrossLanguages(
  languages: Record<string, AdminEventLanguage>,
  questions: EditorFormState["questions"],
): Record<string, AdminEventLanguage> {
  const out = { ...languages };
  for (const [langKey, langVersion] of Object.entries(out)) {
    out[langKey] = {
      ...langVersion,
      questions: questions.map((q, i) => mergeLangQuestionRow(q, langVersion.questions?.[i])),
    };
  }
  return out;
}

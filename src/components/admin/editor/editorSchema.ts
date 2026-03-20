import { z } from "zod";

import { editorQuestionRowSchema, editorQuotaRowSchema, eventPrimaryTitle, eventSlug } from "@/db/zod";

import type { EditorFormState } from "./types";

const optionalDateOrEmpty = z.union([z.string().min(1), z.date(), z.null()]);

/** Client-side validation for fields shared with the server event body. */
export const editorSchema = z
  .object({
    title: eventPrimaryTitle,
    slug: eventSlug,
    quotas: z.array(editorQuotaRowSchema).min(1),
    questions: z.array(editorQuestionRowSchema),
    date: optionalDateOrEmpty,
    endDate: optionalDateOrEmpty,
    registrationStartDate: optionalDateOrEmpty,
    registrationEndDate: optionalDateOrEmpty,
  })
  .refine((data) => !data.date || !data.endDate || new Date(data.endDate) >= new Date(data.date), {
    path: ["dateInverted"],
    message: "dateInverted",
  })
  .refine(
    (data) =>
      !data.registrationStartDate ||
      !data.registrationEndDate ||
      new Date(data.registrationEndDate) >= new Date(data.registrationStartDate),
    {
      path: ["registrationDateInverted"],
      message: "registrationDateInverted",
    },
  )
  .refine((data) => data.date || data.registrationStartDate, {
    path: ["dateMissing"],
    message: "dateMissing",
  })
  .refine((data) => !(data.endDate && !data.date), {
    path: ["endDateWithoutDate"],
    message: "endDateWithoutDate",
  })
  .refine(
    (data) =>
      (data.registrationStartDate && data.registrationEndDate) ||
      (!data.registrationStartDate && !data.registrationEndDate),
    {
      path: ["registrationDateIncomplete"],
      message: "registrationDateIncomplete",
    },
  );

/** Subset of form state passed into `editorSchema` (matches server-side shape). */
export function editorValidationPayload(form: EditorFormState) {
  return {
    title: form.title,
    slug: form.slug,
    quotas: form.quotas.map((q) => ({ title: q.title, size: q.size })),
    questions: form.questions.map((q) => ({ question: q.question })),
    date: form.date || null,
    endDate: form.endDate || null,
    registrationStartDate: form.registrationStartDate || null,
    registrationEndDate: form.registrationEndDate || null,
  };
}

/** Field paths that map to the Basic details tab in the editor. */
export const EDITOR_BASIC_TAB_ERROR_KEYS = [
  "title",
  "slug",
  "dateInverted",
  "registrationDateInverted",
  "dateMissing",
  "endDateWithoutDate",
  "registrationDateIncomplete",
] as const;

export const EDITOR_BASIC_TAB_ERROR_KEY_SET = new Set<string>(EDITOR_BASIC_TAB_ERROR_KEYS);

/** Which editor tabs currently show validation errors (from flattened error keys). */
export function editorTabErrors(fieldErrors: Record<string, string>): {
  basic: boolean;
  quotas: boolean;
  questions: boolean;
} {
  const keys = Object.keys(fieldErrors);
  if (keys.length === 0) return { basic: false, quotas: false, questions: false };
  return {
    basic: keys.some((k) => EDITOR_BASIC_TAB_ERROR_KEY_SET.has(k)),
    quotas: keys.some((k) => k === "quotas" || k.startsWith("quotas[")),
    questions: keys.some((k) => k.startsWith("questions[")),
  };
}

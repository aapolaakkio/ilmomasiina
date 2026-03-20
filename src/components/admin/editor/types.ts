import type { PaymentMode, QuestionID, QuotaID } from "@/db/schema";
import type { AdminEventLanguage, Question, Quota } from "@/db/zod";

/** Quota row in the editor: stable `key` for DnD, optional `id` until persisted. */
export type EditorQuota = Pick<Quota, "title" | "size" | "price"> & {
  key: string;
  id?: QuotaID;
};

/** Question row in the editor: stable `key` for DnD, optional `id` until persisted. */
export type EditorQuestion = Pick<Question, "question" | "type" | "required" | "public" | "options" | "prices"> & {
  key: string;
  id?: QuestionID;
};

let nextKey = 0;
export function generateKey(): string {
  nextKey += 1;
  return `k${nextKey}`;
}

export type EditorFormState = {
  title: string;
  slug: string;
  draft: boolean;
  listed: boolean;
  category: string;
  date: string;
  endDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  openQuotaSize: number;
  description: string;
  price: string;
  location: string;
  webpageUrl: string;
  signupsPublic: boolean;
  nameQuestion: boolean;
  emailQuestion: boolean;
  payments: PaymentMode;
  defaultLanguage: string;
  languages: Record<string, AdminEventLanguage>;
  verificationEmail: string;
  quotas: EditorQuota[];
  questions: EditorQuestion[];
};

export type EditorUpdateField = <K extends keyof EditorFormState>(key: K, value: EditorFormState[K]) => void;

export type EditorCoreProps = {
  form: EditorFormState;
  updateField: EditorUpdateField;
};

export type EditorTabProps = EditorCoreProps & {
  fieldErrors: Record<string, string>;
  selectedLanguage: string;
  readOnly?: boolean;
};

/** Fields that exist in both the top-level event and language versions. */
export type LocalizableFields = Pick<
  AdminEventLanguage,
  "title" | "description" | "price" | "location" | "webpageUrl" | "verificationEmail"
>;

export type LocalizableFieldKey = keyof LocalizableFields;

/** True when editing the default locale or a language without its own version yet. */
export function isDefaultLanguageView(form: EditorFormState, selectedLanguage: string): boolean {
  return selectedLanguage === form.defaultLanguage || !form.languages[selectedLanguage];
}

/** Get a localizable field value, reading from the language version if not default. */
export function getLocalizedValue<K extends LocalizableFieldKey>(
  form: EditorFormState,
  field: K,
  selectedLanguage: string,
): string {
  if (isDefaultLanguageView(form, selectedLanguage)) {
    const v = form[field];
    return v == null ? "" : String(v);
  }
  const lang = form.languages[selectedLanguage];
  const v = lang[field];
  return v == null ? "" : String(v);
}

/** Set a localizable field value, writing to the language version if not default. */
export function setLocalizedValue<K extends LocalizableFieldKey>(
  form: EditorFormState,
  updateField: EditorUpdateField,
  field: K,
  value: string,
  selectedLanguage: string,
): void {
  if (isDefaultLanguageView(form, selectedLanguage)) {
    updateField(field, value as EditorFormState[K]);
  } else {
    const lang = {
      ...form.languages[selectedLanguage],
      [field]: value || null,
    };
    updateField("languages", { ...form.languages, [selectedLanguage]: lang });
  }
}

/** Create an empty language version matching current quotas/questions structure. */
export function createEmptyLanguageVersion(form: EditorFormState): AdminEventLanguage {
  return {
    title: "",
    description: null,
    price: null,
    location: null,
    webpageUrl: null,
    verificationEmail: null,
    quotas: form.quotas.map(() => ({ title: "" })),
    questions: form.questions.map((q) => ({
      question: "",
      options: q.options ? q.options.map(() => "") : null,
    })),
  };
}

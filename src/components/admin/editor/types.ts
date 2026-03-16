import type { AdminEventLanguage, PaymentMode, QuestionType } from "@/models";

export type EditorQuota = {
  key: string;
  id?: string;
  title: string;
  size: number | null;
  price: number;
};

export type EditorQuestion = {
  key: string;
  id?: string;
  question: string;
  type: QuestionType;
  required: boolean;
  public: boolean;
  options: string[] | null;
  prices: number[] | null;
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

export type EditorTabProps = {
  form: EditorFormState;
  updateField: <K extends keyof EditorFormState>(key: K, value: EditorFormState[K]) => void;
  fieldErrors: Record<string, string>;
  selectedLanguage: string;
};

/** Fields that exist in both the top-level event and language versions. */
export type LocalizableFields = {
  title: string;
  description: string | null;
  price: string | null;
  location: string | null;
  webpageUrl: string | null;
  verificationEmail: string | null;
};

/** Get a localizable field value, reading from the language version if not default. */
export function getLocalizedValue<K extends keyof LocalizableFields>(
  form: EditorFormState,
  field: K,
  selectedLanguage: string,
): string {
  if (selectedLanguage === form.defaultLanguage || !form.languages[selectedLanguage]) {
    return (form[field] as string) ?? "";
  }
  const lang = form.languages[selectedLanguage];
  return ((lang as Record<string, unknown>)[field] as string) ?? "";
}

/** Set a localizable field value, writing to the language version if not default. */
export function setLocalizedValue<K extends keyof LocalizableFields>(
  form: EditorFormState,
  updateField: <F extends keyof EditorFormState>(key: F, value: EditorFormState[F]) => void,
  field: K,
  value: string,
  selectedLanguage: string,
): void {
  if (selectedLanguage === form.defaultLanguage || !form.languages[selectedLanguage]) {
    updateField(field, value as EditorFormState[K]);
  } else {
    const lang = { ...form.languages[selectedLanguage], [field]: value || null };
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

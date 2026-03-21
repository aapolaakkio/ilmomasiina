import { PaymentMode } from "@/db/schema";
import type { AdminEventResponse } from "@/db/zod";

import { generateKey } from "./types";

function stripIdsForCopy(event: AdminEventResponse) {
  return {
    ...event,
    title: `Copy: ${event.title}`,
    slug: "",
    draft: true,
    quotas: event.quotas.map((q) => ({ ...q, id: undefined, signups: [] })),
    questions: event.questions.map((q) => ({ ...q, id: undefined })),
  };
}

/** Event row as returned from the API or from {@link stripIdsForCopy} for duplicate flow. */
type AdminEventSourceForEditor = AdminEventResponse | ReturnType<typeof stripIdsForCopy>;

function mapAdminEventToEditorForm(src: AdminEventSourceForEditor) {
  return {
    title: src.title ?? "",
    slug: src.slug ?? "",
    draft: src.draft ?? true,
    listed: src.listed ?? true,
    category: src.category ?? "",
    date: src.date?.toISOString() ?? "",
    endDate: src.endDate?.toISOString() ?? "",
    registrationStartDate: src.registrationStartDate?.toISOString() ?? "",
    registrationEndDate: src.registrationEndDate?.toISOString() ?? "",
    openQuotaSize: src.openQuotaSize ?? 0,
    description: src.description ?? "",
    price: src.price ?? "",
    location: src.location ?? "",
    webpageUrl: src.webpageUrl ?? "",
    signupsPublic: src.signupsPublic ?? false,
    nameQuestion: src.nameQuestion ?? true,
    emailQuestion: src.emailQuestion ?? true,
    payments: src.payments ?? PaymentMode.DISABLED,
    defaultLanguage: src.defaultLanguage ?? "",
    languages: src.languages ?? {},
    verificationEmail: src.verificationEmail ?? "",
    quotas: src.quotas?.map((q) => ({
      key: generateKey(),
      id: q.id,
      title: q.title,
      size: q.size,
      price: q.price ?? 0,
    })) ?? [{ key: generateKey(), title: "", size: null, price: 0 }],
    questions:
      src.questions?.map((q) => ({
        key: generateKey(),
        id: q.id,
        question: q.question,
        type: q.type,
        required: q.required,
        public: q.public,
        options: q.options,
        prices: q.prices ?? null,
      })) ?? [],
  };
}

function emptyEditorForm() {
  return {
    title: "",
    slug: "",
    draft: true,
    listed: true,
    category: "",
    date: "",
    endDate: "",
    registrationStartDate: "",
    registrationEndDate: "",
    openQuotaSize: 0,
    description: "",
    price: "",
    location: "",
    webpageUrl: "",
    signupsPublic: false,
    nameQuestion: true,
    emailQuestion: true,
    payments: PaymentMode.DISABLED,
    defaultLanguage: "",
    languages: {},
    verificationEmail: "",
    quotas: [{ key: generateKey(), title: "", size: null, price: 0 }],
    questions: [],
  };
}

/** Build editor state from server event (or empty template for a new event). */
export function getInitialEditorForm(initialEvent: AdminEventResponse | null, copy: boolean | undefined) {
  if (!initialEvent) {
    return emptyEditorForm();
  }
  const src = copy ? stripIdsForCopy(initialEvent) : initialEvent;
  return mapAdminEventToEditorForm(src);
}

/** One-time mount snapshot so lazy `useState` initializers share a single `getInitialEditorForm` result. */
export function createInitialEditorSession(initialEvent: AdminEventResponse | null, copy: boolean | undefined) {
  const form = getInitialEditorForm(initialEvent, copy);
  return { form, selectedLanguage: form.defaultLanguage || "fi" };
}

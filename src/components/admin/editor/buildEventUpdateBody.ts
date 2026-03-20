import type { EditorFormState } from "./types";

/** Converts editor form state into the API request body for create/update. */
export function buildEventUpdateBody(form: EditorFormState, asDraft: boolean) {
  const {
    quotas,
    questions,
    date,
    endDate,
    registrationStartDate,
    registrationEndDate,
    description,
    price,
    location,
    webpageUrl,
    verificationEmail,
    draft: _ignoredDraft,
    ...rest
  } = form;

  return {
    ...rest,
    draft: asDraft,
    date: date ? new Date(date) : null,
    endDate: endDate ? new Date(endDate) : null,
    registrationStartDate: registrationStartDate ? new Date(registrationStartDate) : null,
    registrationEndDate: registrationEndDate ? new Date(registrationEndDate) : null,
    description: description || null,
    price: price || null,
    location: location || null,
    webpageUrl: webpageUrl || null,
    verificationEmail: verificationEmail || null,
    quotas: quotas.map(({ key: _k, ...q }, i) => ({ ...q, order: i })),
    questions: questions.map(({ key: _k, ...q }, i) => ({ ...q, order: i })),
  };
}

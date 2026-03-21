import type { SignupForEditResponse, UserEventListItem, UserEventResponse } from "@/db/zod";

type EventForEditSignup = SignupForEditResponse["event"];

/** Top-level localizable fields shared by all event types. */
const LOCALIZABLE_FIELDS = ["title", "description", "price", "location", "webpageUrl"] as const;

/** Overrides top-level localizable fields from the locale, falling back to the event's own values. */
function localizeFields<T extends Record<string, unknown>>(event: T, locale: Record<string, unknown>) {
  const result = { ...event };
  for (const field of LOCALIZABLE_FIELDS) {
    if (field in locale) {
      (result as Record<string, unknown>)[field] = (locale[field] as string) || (event[field] as string);
    }
  }
  return result;
}

/** Overrides localized properties in the event and quotas with localized versions.
 *
 * If the language version is not found (including invalid languages), falls back to the default language.
 */
export function getLocalizedEventListItem(event: UserEventListItem, language: string) {
  const locale = event.languages?.[language] ?? event;
  return {
    ...localizeFields(event, locale),
    quotas: event.quotas.map((quota, index) => ({
      ...quota,
      title: locale.quotas[index]?.title || quota.title,
    })),
  };
}

/** Overrides localized properties in the event, quotas and questions with localized versions.
 *
 * If the language version is not found (including invalid languages), falls back to the default language.
 */
export function getLocalizedEvent<E extends UserEventResponse | EventForEditSignup>(event: E, language: string) {
  const locale = event.languages?.[language] ?? event;
  return {
    ...localizeFields(event, locale),
    questions: event.questions.map((question, index) => ({
      ...question,
      question: locale.questions[index]?.question || question.question,
      options: locale.questions[index]?.options || question.options,
    })),
    quotas:
      event.quotas?.map((quota, index) => ({
        ...quota,
        title: locale.quotas[index]?.title || quota.title,
      })) ?? [],
  };
}

/** Overrides localized properties in the quota of the edited signup with localized versions.
 *
 * If the language version is not found (including invalid languages), falls back to the default language.
 */
export function getLocalizedSignup({ event, signup }: SignupForEditResponse, language: string) {
  const locale = event.languages?.[language];
  // Short circuit: don't attempt anything if we don't have the locale.
  if (!locale) return signup;
  // This is a bit unfortunate, but we have to find the quota manually.
  const quotaIndex = event.quotas.findIndex((q) => q.id === signup.quota.id);
  return {
    ...signup,
    quota: {
      ...signup.quota,
      title: locale.quotas[quotaIndex]?.title ?? signup.quota.title,
    },
  };
}

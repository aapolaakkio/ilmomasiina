import type { AdminEventLanguage } from "@/db/zod";

import type { EventID, QuestionID, QuotaID, eventLanguages, questionLanguages, quotaLanguages } from "./schema";

// --- Language reconstruction helpers ---

type EventLangRow = typeof eventLanguages.$inferSelect;
type QuotaLangRow = typeof quotaLanguages.$inferSelect;
type QuestionLangRow = typeof questionLanguages.$inferSelect;

/** Default-language fields that live on the event row. */
interface EventDefaultFields {
  title: string;
  description: string | null;
  price: string | null;
  location: string | null;
  webpageUrl: string | null;
  verificationEmail: string | null;
}

/**
 * Reconstructs the API-compatible language fields for an event.
 * Default language content comes from the main table columns.
 * Language rows only contain non-default translations.
 */
export function reconstructEventLanguages(
  eventDefaults: EventDefaultFields,
  eventLangRows: EventLangRow[],
  quotasWithLangs: { id: string; title: string; languages: QuotaLangRow[] }[],
  questionsWithLangs: {
    id: string;
    question: string;
    options: string[] | null;
    languages: QuestionLangRow[];
  }[],
  includeAdmin: boolean,
) {
  // Build languages map from non-default language rows
  const languages: Record<string, AdminEventLanguage> = {};
  for (const langRow of eventLangRows) {
    const langQuotas = quotasWithLangs.map((q) => {
      const row = q.languages.find((r) => r.language === langRow.language);
      return { title: row?.title ?? "" };
    });

    const langQuestions = questionsWithLangs.map((q) => {
      const row = q.languages.find((r) => r.language === langRow.language);
      return { question: row?.question ?? "", options: row?.options ?? null };
    });

    const lang: AdminEventLanguage = {
      title: langRow.title,
      description: langRow.description ?? null,
      price: langRow.price ?? null,
      location: langRow.location ?? null,
      webpageUrl: langRow.webpageUrl ?? null,
      verificationEmail: includeAdmin ? (langRow.verificationEmail ?? null) : null,
      quotas: langQuotas,
      questions: langQuestions,
    };
    languages[langRow.language] = lang;
  }

  return {
    title: eventDefaults.title,
    description: eventDefaults.description,
    price: eventDefaults.price,
    location: eventDefaults.location,
    webpageUrl: eventDefaults.webpageUrl,
    languages,
    ...(includeAdmin ? { verificationEmail: eventDefaults.verificationEmail } : {}),
  };
}

/** Gets the title for a quota in a specific language, falling back to the main table default. */
export function getTitleForLanguage(
  defaultTitle: string,
  languages: { language: string; title: string }[],
  language: string,
) {
  const row = languages.find((r) => r.language === language);
  return row?.title ?? defaultTitle;
}

/** Gets question text and options in a specific language, falling back to the main table defaults. */
export function getQuestionForLanguage(
  defaultQuestion: string,
  defaultOptions: string[] | null,
  languages: { language: string; question: string; options: string[] | null }[],
  language: string,
) {
  const row = languages.find((r) => r.language === language);
  return {
    question: row?.question ?? defaultQuestion,
    options: row?.options ?? defaultOptions,
  };
}

// --- Language row builders for insert operations ---

type BodyLanguages = Record<string, AdminEventLanguage> | undefined;

/** Builds event language insert rows from body languages. */
export function buildEventLanguageRows(
  eventId: EventID,
  bodyLanguages: BodyLanguages,
): (typeof eventLanguages.$inferInsert)[] {
  if (!bodyLanguages) return [];
  return Object.entries(bodyLanguages).map(([lang, langData]) => ({
    eventId,
    language: lang,
    title: langData.title,
    description: langData.description ?? null,
    price: langData.price ?? null,
    location: langData.location ?? null,
    webpageUrl: langData.webpageUrl ?? null,
    verificationEmail: langData.verificationEmail ?? null,
  }));
}

/** Builds question language insert rows from body languages, matching by index. */
export function buildQuestionLanguageRows(
  questionIds: QuestionID[],
  bodyLanguages: BodyLanguages,
): (typeof questionLanguages.$inferInsert)[] {
  if (!bodyLanguages) return [];
  const rows: (typeof questionLanguages.$inferInsert)[] = [];
  for (let i = 0; i < questionIds.length; i++) {
    for (const [lang, langData] of Object.entries(bodyLanguages)) {
      const langQuestion = langData.questions?.[i];
      if (langQuestion) {
        rows.push({
          questionId: questionIds[i],
          language: lang,
          question: langQuestion.question,
          options: langQuestion.options ?? null,
        });
      }
    }
  }
  return rows;
}

/** Builds quota language insert rows from body languages, matching by index. */
export function buildQuotaLanguageRows(
  quotaIds: QuotaID[],
  bodyLanguages: BodyLanguages,
): (typeof quotaLanguages.$inferInsert)[] {
  if (!bodyLanguages) return [];
  const rows: (typeof quotaLanguages.$inferInsert)[] = [];
  for (let i = 0; i < quotaIds.length; i++) {
    for (const [lang, langData] of Object.entries(bodyLanguages)) {
      const langQuota = langData.quotas?.[i];
      if (langQuota) {
        rows.push({
          quotaId: quotaIds[i],
          language: lang,
          title: langQuota.title,
        });
      }
    }
  }
  return rows;
}

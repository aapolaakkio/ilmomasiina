import type { AdminEventResponse, EventCreateBody, EventID } from "@/models";
import { AuditEvent } from "@/models";

import type { AuditLogger } from "../../../auditlog";
import { db } from "../../../db";
import { eventLanguages, events, questionLanguages, questions, quotaLanguages, quotas } from "../../../db/schema";
import { validateEventDates } from "../../../db/validators";
import { getEventByIdForAdmin } from "../../events/getEventDetails";
import { toDate } from "../../utils";
import { normalizeQuestionOptions } from "./normalizeQuestionOptions";

/** Create a new event with quotas and questions. */
// eslint-disable-next-line import/prefer-default-export
export async function createEvent(body: EventCreateBody, auditLogger: AuditLogger): Promise<AdminEventResponse> {
  const { questions: _questions, quotas: _quotas, languages: bodyLanguages, ...baseBody } = body;

  const eventData = {
    ...baseBody,
    date: toDate(body.date),
    endDate: toDate(body.endDate),
    registrationStartDate: toDate(body.registrationStartDate),
    registrationEndDate: toDate(body.registrationEndDate),
  };

  validateEventDates(
    eventData as {
      date: Date | null;
      endDate: Date | null;
      registrationStartDate: Date | null;
      registrationEndDate: Date | null;
    },
  );

  const questionsToCreate = body.questions.map((question) => ({
    ...question,
    ...normalizeQuestionOptions(question),
  }));

  const eventId = await db.transaction(async (tx) => {
    // Insert event (non-localizable fields only)
    const [created] = await tx.insert(events).values(eventData).returning({ id: events.id });

    // Insert non-default language rows only (default language content is on the event row)
    const allEventLangs: (typeof eventLanguages.$inferInsert)[] = [];
    for (const [lang, langData] of Object.entries(bodyLanguages ?? {})) {
      allEventLangs.push({
        eventId: created.id,
        language: lang,
        title: langData.title,
        description: langData.description ?? null,
        price: langData.price ?? null,
        location: langData.location ?? null,
        webpageUrl: langData.webpageUrl ?? null,
        verificationEmail: langData.verificationEmail ?? null,
      });
    }
    if (allEventLangs.length > 0) {
      await tx.insert(eventLanguages).values(allEventLangs);
    }

    // Insert questions and quotas in parallel (both depend only on the event ID)
    await Promise.all([
      // Insert questions and their language rows
      (async () => {
        if (questionsToCreate.length === 0) return;
        const questionRows = await tx
          .insert(questions)
          .values(
            questionsToCreate.map((q, order) => ({
              question: q.question,
              options: q.options ?? null,
              type: q.type,
              prices: q.prices,
              required: q.required,
              public: q.public,
              eventId: created.id,
              order,
            })),
          )
          .returning({ id: questions.id });

        const allQuestionLangs: (typeof questionLanguages.$inferInsert)[] = [];
        for (let i = 0; i < questionRows.length; i++) {
          const qId = questionRows[i].id;
          for (const [lang, langData] of Object.entries(bodyLanguages ?? {})) {
            const langQuestion = langData.questions?.[i];
            if (langQuestion) {
              allQuestionLangs.push({
                questionId: qId,
                language: lang,
                question: langQuestion.question,
                options: langQuestion.options ?? null,
              });
            }
          }
        }
        if (allQuestionLangs.length > 0) {
          await tx.insert(questionLanguages).values(allQuestionLangs);
        }
      })(),
      // Insert quotas and their language rows
      (async () => {
        if (body.quotas.length === 0) return;
        const quotaRows = await tx
          .insert(quotas)
          .values(
            body.quotas.map((q, order) => ({
              title: q.title,
              size: q.size,
              price: q.price ?? 0,
              eventId: created.id,
              order,
            })),
          )
          .returning({ id: quotas.id });

        const allQuotaLangs: (typeof quotaLanguages.$inferInsert)[] = [];
        for (let i = 0; i < quotaRows.length; i++) {
          const qId = quotaRows[i].id;
          for (const [lang, langData] of Object.entries(bodyLanguages ?? {})) {
            const langQuota = langData.quotas?.[i];
            if (langQuota) {
              allQuotaLangs.push({
                quotaId: qId,
                language: lang,
                title: langQuota.title,
              });
            }
          }
        }
        if (allQuotaLangs.length > 0) {
          await tx.insert(quotaLanguages).values(allQuotaLangs);
        }
      })(),
    ]);

    await auditLogger(AuditEvent.CREATE_EVENT, { event: { id: created.id, title: body.title }, tx });
    return created.id;
  });

  return getEventByIdForAdmin(eventId as EventID);
}

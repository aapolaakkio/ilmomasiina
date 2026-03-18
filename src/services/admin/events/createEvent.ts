import { buildEventLanguageRows, buildQuestionLanguageRows, buildQuotaLanguageRows } from "@/db/helpers";
import { AuditEvent, type UserID } from "@/db/schema";
import type { AdminEventResponse, EventCreateBody } from "@/db/zod";

import type { AuditLogger } from "../../../auditlog";
import { db } from "../../../db";
import {
  eventEditors,
  eventLanguages,
  events,
  questionLanguages,
  questions,
  quotaLanguages,
  quotas,
} from "../../../db/schema";
import { validateEventDates } from "../../../db/validators";
import { getEventByIdForAdmin } from "../../events/getEventDetails";
import { toDate } from "../../utils";
import { normalizeQuestionOptions } from "./normalizeQuestionOptions";

/** Create a new event with quotas and questions. */
export async function createEvent(
  body: EventCreateBody,
  auditLogger: AuditLogger,
  userId: UserID,
): Promise<AdminEventResponse> {
  const { questions: _questions, quotas: _quotas, languages: bodyLanguages, ...baseBody } = body;

  const eventData = {
    ...baseBody,
    date: toDate(body.date),
    endDate: toDate(body.endDate),
    registrationStartDate: toDate(body.registrationStartDate),
    registrationEndDate: toDate(body.registrationEndDate),
  };

  validateEventDates(eventData);

  const questionsToCreate = body.questions.map((question) => ({
    ...question,
    ...normalizeQuestionOptions(question),
  }));

  const eventId = await db.transaction(async (tx) => {
    // Insert event (non-localizable fields only)
    const [created] = await tx.insert(events).values(eventData).returning({ id: events.id });

    // Insert non-default language rows only (default language content is on the event row)
    const eventLangRows = buildEventLanguageRows(created.id, bodyLanguages);
    if (eventLangRows.length > 0) {
      await tx.insert(eventLanguages).values(eventLangRows);
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

        const questionLangRows = buildQuestionLanguageRows(
          questionRows.map((q) => q.id),
          bodyLanguages,
        );
        if (questionLangRows.length > 0) {
          await tx.insert(questionLanguages).values(questionLangRows);
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

        const quotaLangRows = buildQuotaLanguageRows(
          quotaRows.map((q) => q.id),
          bodyLanguages,
        );
        if (quotaLangRows.length > 0) {
          await tx.insert(quotaLanguages).values(quotaLangRows);
        }
      })(),
    ]);

    // Add creator as event editor
    await tx.insert(eventEditors).values({ eventId: created.id, userId });

    await auditLogger(AuditEvent.CREATE_EVENT, {
      event: { id: created.id, title: body.title },
      tx,
    });
    return created.id;
  });

  return getEventByIdForAdmin(eventId);
}

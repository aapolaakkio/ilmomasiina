import { and, eq, inArray, isNull, notInArray } from "drizzle-orm";

import type {
  AdminEventResponse,
  EditConflictError,
  EventID,
  EventUpdateBody,
  WouldMoveSignupsToQueueError,
} from "@/models";
import { AuditEvent } from "@/models";

import type { AuditLogger } from "../../../auditlog";
import { db } from "../../../db";
import { eventLanguages, events, questionLanguages, questions, quotaLanguages, quotas } from "../../../db/schema";
import { validateEventDates } from "../../../db/validators";
import { getEventByIdForAdmin } from "../../events/getEventDetails";
import {
  fetchActiveQuotasForEvent,
  fetchActiveSignupsForEvent,
  handlePositionSideEffects,
} from "../../signups/computeSignupPosition";
import { toDate } from "../../utils";
import { EditConflict } from "./errors";
import { normalizeQuestionOptions } from "./normalizeQuestionOptions";

/** Update an event including its quotas and questions. */
// eslint-disable-next-line import/prefer-default-export
export async function updateEvent(
  eventId: EventID,
  body: EventUpdateBody,
  auditLogger: AuditLogger,
): Promise<AdminEventResponse | EditConflictError | WouldMoveSignupsToQueueError> {
  await db.transaction(async (tx) => {
    // Lock the event
    const [event] = await tx.select().from(events).where(eq(events.id, eventId)).for("update");
    if (!event) throw new Error("No event found with id");

    const previousOpenQuotaSize = event.openQuotaSize;

    // Snapshot state and lock quotas/questions in parallel
    const [previousSignupsRaw, previousQuotas, existingQuotas, existingQuestions] = await Promise.all([
      fetchActiveSignupsForEvent(eventId, tx),
      fetchActiveQuotasForEvent(eventId, tx),
      tx
        .select({ id: quotas.id })
        .from(quotas)
        .where(and(eq(quotas.eventId, eventId), isNull(quotas.deletedAt)))
        .for("update"),
      tx
        .select({ id: questions.id })
        .from(questions)
        .where(and(eq(questions.eventId, eventId), isNull(questions.deletedAt)))
        .for("update"),
    ]);
    const previousSignups = previousSignupsRaw.map((s) => ({ id: s.id, quotaId: s.quotaId }));

    const updatedQuestions = body.questions?.map((question, order) => ({
      ...question,
      ...normalizeQuestionOptions(question),
      order,
      existingId: question.id && existingQuestions.find((old) => question.id === old.id) ? question.id : undefined,
    }));
    const updatedQuotas = body.quotas?.map((quota, order) => ({
      ...quota,
      order,
      existingId: quota.id && existingQuotas.find((old) => quota.id === old.id) ? quota.id : undefined,
    }));

    const deletedQuestions = updatedQuestions?.filter((q) => !q.existingId && q.id).map((q) => q.id!) ?? [];
    const deletedQuotas = updatedQuotas?.filter((q) => !q.existingId && q.id).map((q) => q.id!) ?? [];

    // Check for edit conflicts
    const expectedUpdatedAt = new Date(body.updatedAt ?? "");
    if (event.updatedAt.getTime() !== expectedUpdatedAt.getTime() || deletedQuestions.length || deletedQuotas.length) {
      throw new EditConflict(event.updatedAt, deletedQuotas, deletedQuestions);
    }

    const { languages: bodyLanguages, ...rest } = body;

    // Build update data (includes localizable fields on the main table now)
    const updateData: Record<string, unknown> = {
      ...rest,
      registrationEndDate: toDate(body.registrationEndDate),
      registrationStartDate: toDate(body.registrationStartDate),
      date: toDate(body.date),
      endDate: toDate(body.endDate),
      updatedAt: new Date(),
    };
    // Remove relation fields from update
    delete updateData.questions;
    delete updateData.quotas;
    delete updateData.updatedAt;
    delete updateData.moveSignupsToQueue;

    // Validate dates
    const mergedEvent = { ...event, ...updateData };
    validateEventDates(
      mergedEvent as {
        date: Date | null;
        endDate: Date | null;
        registrationStartDate: Date | null;
        registrationEndDate: Date | null;
      },
    );

    updateData.updatedAt = new Date();
    await tx.update(events).set(updateData).where(eq(events.id, eventId));

    // Get title for audit log (from body or existing event row)
    const auditTitle = body.title ?? event.title;

    // Handle default language swap: if defaultLanguage changed, swap content between
    // the main table and language rows
    if (body.defaultLanguage && body.defaultLanguage !== event.defaultLanguage) {
      // Save current main table fields as a language row for the old default
      await tx.insert(eventLanguages).values({
        eventId,
        language: event.defaultLanguage,
        title: event.title,
        description: event.description ?? null,
        price: event.price ?? null,
        location: event.location ?? null,
        webpageUrl: event.webpageUrl ?? null,
        facebookUrl: event.facebookUrl ?? null,
        verificationEmail: event.verificationEmail ?? null,
      });

      // Find new default's language row and copy to main table, then delete it
      const newDefaultLang = await tx.query.eventLanguages.findFirst({
        where: { eventId, language: body.defaultLanguage },
      });
      if (newDefaultLang) {
        updateData.title = body.title ?? newDefaultLang.title;
        updateData.description = body.description ?? newDefaultLang.description;
        updateData.price = body.price ?? newDefaultLang.price;
        updateData.location = body.location ?? newDefaultLang.location;
        updateData.webpageUrl = body.webpageUrl ?? newDefaultLang.webpageUrl;
        updateData.facebookUrl = body.facebookUrl ?? newDefaultLang.facebookUrl;
        updateData.verificationEmail = body.verificationEmail ?? newDefaultLang.verificationEmail;
        await tx
          .delete(eventLanguages)
          .where(and(eq(eventLanguages.eventId, eventId), eq(eventLanguages.language, body.defaultLanguage)));
      }
    }

    // Update non-default event language rows (delete + re-insert)
    if (bodyLanguages !== undefined) {
      // Delete all non-default language rows and re-insert
      await tx.delete(eventLanguages).where(
        and(
          eq(eventLanguages.eventId, eventId),
          // After a language swap, the old default is now a non-default row we just inserted.
          // Delete all and re-insert from bodyLanguages to be consistent.
        ),
      );

      const allEventLangs: (typeof eventLanguages.$inferInsert)[] = [];
      for (const [lang, langData] of Object.entries(bodyLanguages)) {
        allEventLangs.push({
          eventId,
          language: lang,
          title: langData.title,
          description: langData.description ?? null,
          price: langData.price ?? null,
          location: langData.location ?? null,
          webpageUrl: langData.webpageUrl ?? null,
          facebookUrl: langData.facebookUrl ?? null,
          verificationEmail: langData.verificationEmail ?? null,
        });
      }
      if (allEventLangs.length > 0) {
        await tx.insert(eventLanguages).values(allEventLangs);
      }
    }

    // Update questions
    if (updatedQuestions !== undefined) {
      const reuseIds = updatedQuestions.map((q) => q.existingId).filter(Boolean) as string[];

      // Soft-delete removed questions
      if (reuseIds.length > 0) {
        await tx
          .update(questions)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(questions.eventId, eventId), notInArray(questions.id, reuseIds), isNull(questions.deletedAt)));
      } else {
        await tx
          .update(questions)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(questions.eventId, eventId), isNull(questions.deletedAt)));
      }

      // Track new question IDs for language row insertion
      const questionIdMap: string[] = [];

      for (const question of updatedQuestions) {
        if (question.existingId) {
          // eslint-disable-next-line no-await-in-loop
          await tx
            .update(questions)
            .set({
              question: question.question,
              options: question.options ?? null,
              type: question.type,
              prices: question.prices,
              required: question.required,
              public: question.public,
              order: question.order,
              updatedAt: new Date(),
            })
            .where(eq(questions.id, question.existingId));
          questionIdMap.push(question.existingId);
        } else {
          // eslint-disable-next-line no-await-in-loop
          const [created] = await tx
            .insert(questions)
            .values({
              question: question.question,
              options: question.options ?? null,
              type: question.type,
              prices: question.prices,
              required: question.required,
              public: question.public,
              order: question.order,
              eventId,
            })
            .returning({ id: questions.id });
          questionIdMap.push(created.id);
        }
      }

      // Delete and re-insert non-default question language rows
      if (questionIdMap.length > 0) {
        await tx.delete(questionLanguages).where(inArray(questionLanguages.questionId, questionIdMap));

        const allQuestionLangs: (typeof questionLanguages.$inferInsert)[] = [];
        for (let i = 0; i < updatedQuestions.length; i++) {
          const qId = questionIdMap[i];
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
      }
    }

    // Update quotas
    if (updatedQuotas !== undefined) {
      const reuseIds = updatedQuotas.map((q) => q.existingId).filter(Boolean) as string[];

      if (reuseIds.length > 0) {
        await tx
          .update(quotas)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(quotas.eventId, eventId), notInArray(quotas.id, reuseIds), isNull(quotas.deletedAt)));
      } else {
        await tx
          .update(quotas)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(quotas.eventId, eventId), isNull(quotas.deletedAt)));
      }

      // Track new quota IDs for language row insertion
      const quotaIdMap: string[] = [];

      for (const quota of updatedQuotas) {
        if (quota.existingId) {
          // eslint-disable-next-line no-await-in-loop
          await tx
            .update(quotas)
            .set({
              title: quota.title,
              size: quota.size,
              price: quota.price ?? 0,
              order: quota.order,
              updatedAt: new Date(),
            })
            .where(eq(quotas.id, quota.existingId));
          quotaIdMap.push(quota.existingId);
        } else {
          // eslint-disable-next-line no-await-in-loop
          const [created] = await tx
            .insert(quotas)
            .values({
              title: quota.title,
              size: quota.size,
              price: quota.price ?? 0,
              order: quota.order,
              eventId,
            })
            .returning({ id: quotas.id });
          quotaIdMap.push(created.id);
        }
      }

      // Delete and re-insert non-default quota language rows
      if (quotaIdMap.length > 0) {
        await tx.delete(quotaLanguages).where(inArray(quotaLanguages.quotaId, quotaIdMap));

        const allQuotaLangs: (typeof quotaLanguages.$inferInsert)[] = [];
        for (let i = 0; i < updatedQuotas.length; i++) {
          const qId = quotaIdMap[i];
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
      }
    }

    await handlePositionSideEffects(eventId, tx, {
      moveSignupsToQueue: body.moveSignupsToQueue,
      previousSignups,
      previousQuotas,
      previousOpenQuotaSize,
    });

    const wasPublic = !event.draft;
    const isPublic = body.draft !== undefined ? !body.draft : wasPublic;
    let action: AuditEvent;
    if (isPublic === wasPublic) action = AuditEvent.EDIT_EVENT;
    else action = isPublic ? AuditEvent.PUBLISH_EVENT : AuditEvent.UNPUBLISH_EVENT;

    await auditLogger(action, { event: { id: eventId, title: auditTitle }, tx });
  });

  return getEventByIdForAdmin(eventId);
}

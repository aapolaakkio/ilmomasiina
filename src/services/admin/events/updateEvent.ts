import { and, eq, inArray, isNull, notInArray } from "drizzle-orm";

import { buildEventLanguageRows, buildQuestionLanguageRows, buildQuotaLanguageRows } from "@/db/helpers";
import { AuditEvent, type EventID, type QuestionID, type QuotaID } from "@/db/schema";
import type { EventUpdateBody } from "@/db/zod";

import type { AuditLogger } from "../../../auditlog";
import { db } from "../../../db";
import { activeSignupCutoff } from "../../../db/filters";
import { eventLanguages, events, questionLanguages, questions, quotaLanguages, quotas } from "../../../db/schema";
import { validateEventDates } from "../../../db/validators";
import { getEventByIdForAdmin } from "../../events/getEventDetails";
import { handlePositionSideEffects } from "../../signups/computeSignupPosition";
import { toDate } from "../../utils";
import { EditConflict } from "./errors";
import { normalizeQuestionOptions } from "./normalizeQuestionOptions";

/** Update an event including its quotas and questions. */
export async function updateEvent(eventId: EventID, body: EventUpdateBody, auditLogger: AuditLogger) {
  await db.transaction(async (tx) => {
    // Lock the event
    const [event] = await tx.select().from(events).where(eq(events.id, eventId)).for("update");
    if (!event) throw new Error("No event found with id");

    const previousOpenQuotaSize = event.openQuotaSize;

    const cutoff = activeSignupCutoff();

    // Snapshot state (single relational query) and lock quotas/questions in parallel
    const [eventSnapshot, existingQuotas, existingQuestions] = await Promise.all([
      tx.query.events.findFirst({
        where: { id: { eq: eventId } },
        columns: { openQuotaSize: true },
        with: {
          quotas: {
            where: { deletedAt: { isNull: true } },
            columns: { id: true, size: true },
            with: {
              signups: {
                where: {
                  deletedAt: { isNull: true },
                  OR: [{ confirmedAt: { isNotNull: true } }, { createdAt: { gt: cutoff } }],
                },
                orderBy: { createdAt: "asc" },
                columns: { id: true, quotaId: true },
              },
            },
          },
        },
      }),
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
    if (!eventSnapshot) throw new Error("event missing from DB");

    const previousQuotas = eventSnapshot.quotas.map((q) => ({ id: q.id, size: q.size }));
    const previousSignups = eventSnapshot.quotas.flatMap((q) =>
      q.signups.map((s) => ({ id: s.id, quotaId: s.quotaId })),
    );

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

    const {
      languages: bodyLanguages,
      questions: _q,
      quotas: _qt,
      moveSignupsToQueue: _m,
      updatedAt: _u,
      ...eventFields
    } = body;

    // Build update data (includes localizable fields on the main table now)
    const updateData: Record<string, unknown> = {
      ...eventFields,
      registrationEndDate: toDate(body.registrationEndDate),
      registrationStartDate: toDate(body.registrationStartDate),
      date: toDate(body.date),
      endDate: toDate(body.endDate),
    };

    // Validate dates
    const mergedEvent = { ...event, ...updateData };
    validateEventDates(mergedEvent);

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
        verificationEmail: event.verificationEmail ?? null,
      });

      // Find new default's language row and copy to main table, then delete it
      const newDefaultLang = await tx.query.eventLanguages.findFirst({
        columns: {
          title: true,
          description: true,
          price: true,
          location: true,
          webpageUrl: true,
          verificationEmail: true,
        },
        where: { eventId: { eq: eventId }, language: body.defaultLanguage },
      });
      if (newDefaultLang) {
        updateData.title = body.title ?? newDefaultLang.title;
        updateData.description = body.description ?? newDefaultLang.description;
        updateData.price = body.price ?? newDefaultLang.price;
        updateData.location = body.location ?? newDefaultLang.location;
        updateData.webpageUrl = body.webpageUrl ?? newDefaultLang.webpageUrl;
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

      const eventLangRows = buildEventLanguageRows(eventId, bodyLanguages);
      if (eventLangRows.length > 0) {
        await tx.insert(eventLanguages).values(eventLangRows);
      }
    }

    // Update questions
    if (updatedQuestions !== undefined) {
      const reuseIds = updatedQuestions.map((q) => q.existingId).filter((q) => q !== undefined);

      // Soft-delete removed questions
      const questionDeleteConditions = [eq(questions.eventId, eventId), isNull(questions.deletedAt)];
      if (reuseIds.length > 0) questionDeleteConditions.push(notInArray(questions.id, reuseIds));
      await tx
        .update(questions)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(...questionDeleteConditions));

      // Track new question IDs for language row insertion
      const questionIdMap: QuestionID[] = [];

      for (const question of updatedQuestions) {
        if (question.existingId) {
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

        const questionLangRows = buildQuestionLanguageRows(questionIdMap, bodyLanguages);
        if (questionLangRows.length > 0) {
          await tx.insert(questionLanguages).values(questionLangRows);
        }
      }
    }

    // Update quotas
    if (updatedQuotas !== undefined) {
      const reuseIds = updatedQuotas.map((q) => q.existingId).filter((q) => q !== undefined);

      const quotaDeleteConditions = [eq(quotas.eventId, eventId), isNull(quotas.deletedAt)];
      if (reuseIds.length > 0) quotaDeleteConditions.push(notInArray(quotas.id, reuseIds));
      await tx
        .update(quotas)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(...quotaDeleteConditions));

      // Track new quota IDs for language row insertion
      const quotaIdMap: QuotaID[] = [];

      for (const quota of updatedQuotas) {
        if (quota.existingId) {
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

        const quotaLangRows = buildQuotaLanguageRows(quotaIdMap, bodyLanguages);
        if (quotaLangRows.length > 0) {
          await tx.insert(quotaLanguages).values(quotaLangRows);
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

    await auditLogger(action, {
      event: { id: eventId, title: auditTitle },
      tx,
    });
  });

  return getEventByIdForAdmin(eventId);
}

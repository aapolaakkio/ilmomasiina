import { inArray, lt, sql } from "drizzle-orm";

import { env } from "@/env";
import { db } from "../db";
import {
  answers,
  eventLanguages,
  events,
  questionLanguages,
  questions,
  quotaLanguages,
  quotas,
  signups,
} from "../db/schema";

export default async function removeDeletedData() {
  const cutoff = new Date(Date.now() - env.DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  // Find events to hard-delete
  const deletedEvents = await db.query.events.findMany({
    where: { deletedAt: { lt: cutoff } },
    columns: { id: true },
  });

  if (deletedEvents.length > 0) {
    const eventIds = deletedEvents.map((e) => e.id);
    // Clean up language rows for these events
    await db.delete(eventLanguages).where(inArray(eventLanguages.eventId, eventIds));
    // Clean up quota/question language rows via their parent IDs
    await db
      .delete(quotaLanguages)
      .where(sql`${quotaLanguages.quotaId} IN (SELECT id FROM "quota" WHERE "eventId" IN ${eventIds})`);
    await db
      .delete(questionLanguages)
      .where(sql`${questionLanguages.questionId} IN (SELECT id FROM "question" WHERE "eventId" IN ${eventIds})`);
    // Hard delete the events
    await db.delete(events).where(lt(events.deletedAt, cutoff));
  }

  // Hard delete orphaned questions and their language rows
  const deletedQuestions = await db.query.questions.findMany({
    where: { deletedAt: { lt: cutoff } },
    columns: { id: true },
  });
  if (deletedQuestions.length > 0) {
    const questionIds = deletedQuestions.map((q) => q.id);
    await db.delete(questionLanguages).where(inArray(questionLanguages.questionId, questionIds));
    await db.delete(questions).where(lt(questions.deletedAt, cutoff));
  }

  // Hard delete orphaned quotas and their language rows
  const deletedQuotas = await db.query.quotas.findMany({
    where: { deletedAt: { lt: cutoff } },
    columns: { id: true },
  });
  if (deletedQuotas.length > 0) {
    const quotaIds = deletedQuotas.map((q) => q.id);
    await db.delete(quotaLanguages).where(inArray(quotaLanguages.quotaId, quotaIds));
    await db.delete(quotas).where(lt(quotas.deletedAt, cutoff));
  }

  // Hard delete signups (may fail if payments exist due to FK constraints)
  await db.delete(signups).where(lt(signups.deletedAt, cutoff));

  // Hard delete orphaned answers
  await db.delete(answers).where(lt(answers.deletedAt, cutoff));
}

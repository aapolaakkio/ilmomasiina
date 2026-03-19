import { inArray, lt } from "drizzle-orm";

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

  // Clean up language rows for deleted events, then hard-delete the events
  const deletedEventIds = db.select({ id: events.id }).from(events).where(lt(events.deletedAt, cutoff));
  const deletedEventQuotaIds = db
    .select({ id: quotas.id })
    .from(quotas)
    .where(inArray(quotas.eventId, deletedEventIds));
  const deletedEventQuestionIds = db
    .select({ id: questions.id })
    .from(questions)
    .where(inArray(questions.eventId, deletedEventIds));
  await db.delete(eventLanguages).where(inArray(eventLanguages.eventId, deletedEventIds));
  await db.delete(quotaLanguages).where(inArray(quotaLanguages.quotaId, deletedEventQuotaIds));
  await db.delete(questionLanguages).where(inArray(questionLanguages.questionId, deletedEventQuestionIds));
  await db.delete(events).where(lt(events.deletedAt, cutoff));

  // Hard delete orphaned questions and their language rows
  const deletedQuestionIds = db.select({ id: questions.id }).from(questions).where(lt(questions.deletedAt, cutoff));
  await db.delete(questionLanguages).where(inArray(questionLanguages.questionId, deletedQuestionIds));
  await db.delete(questions).where(lt(questions.deletedAt, cutoff));

  // Hard delete orphaned quotas and their language rows
  const deletedQuotaIds = db.select({ id: quotas.id }).from(quotas).where(lt(quotas.deletedAt, cutoff));
  await db.delete(quotaLanguages).where(inArray(quotaLanguages.quotaId, deletedQuotaIds));
  await db.delete(quotas).where(lt(quotas.deletedAt, cutoff));

  // Hard delete signups (may fail if payments exist due to FK constraints)
  await db.delete(signups).where(lt(signups.deletedAt, cutoff));

  // Hard delete orphaned answers
  await db.delete(answers).where(lt(answers.deletedAt, cutoff));
}

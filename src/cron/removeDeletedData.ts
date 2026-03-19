import { lt } from "drizzle-orm";

import { env } from "@/env";
import { db } from "../db";
import { answers, events, questions, quotas, signups } from "../db/schema";

export default async function removeDeletedData() {
  const cutoff = new Date(Date.now() - env.DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  // Hard-delete events past the grace period.
  // All children (quotas, questions, signups, answers, payments, language rows) cascade automatically.
  await db.delete(events).where(lt(events.deletedAt, cutoff));

  // Hard-delete orphaned quotas/questions/signups/answers that were soft-deleted individually.
  // Their children also cascade automatically.
  await db.delete(questions).where(lt(questions.deletedAt, cutoff));
  await db.delete(quotas).where(lt(quotas.deletedAt, cutoff));
  await db.delete(signups).where(lt(signups.deletedAt, cutoff));
  await db.delete(answers).where(lt(answers.deletedAt, cutoff));
}

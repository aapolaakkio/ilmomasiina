import { inArray } from "drizzle-orm";

import { env } from "@/env";
import { db } from "../db";
import { answers, signups } from "../db/schema";

const redactedName = "Deleted";
const redactedEmail = "deleted@gdpr.invalid";
const redactedAnswer = "Deleted";

export default async function anonymizeOldSignups() {
  const redactOlderThan = new Date(Date.now() - env.ANONYMIZE_AFTER_DAYS * 24 * 60 * 60 * 1000);

  // Find confirmed signups from old events that aren't already anonymized
  const toAnonymize = await db.query.signups.findMany({
    where: {
      // Only confirmed signups
      confirmedAt: { isNotNull: true },
      // Not already anonymized
      OR: [{ firstName: { ne: redactedName } }, { lastName: { ne: redactedName } }, { email: { ne: redactedEmail } }],
    },
    columns: { id: true },
    with: {
      quota: {
        columns: {},
        with: {
          event: {
            columns: { date: true, registrationEndDate: true },
          },
        },
      },
    },
  });

  // Filter to only signups whose events are old enough
  const oldSignups = toAnonymize.filter((s) => {
    const event = s.quota?.event;
    if (!event) return false;
    if (event.date && event.date < redactOlderThan) return true;
    if (!event.date && event.registrationEndDate && event.registrationEndDate < redactOlderThan) return true;
    return false;
  });

  if (oldSignups.length === 0) {
    return;
  }

  const ids = oldSignups.map((s) => s.id);
  console.info(`Anonymizing older signups: ${ids.join(", ")}`);

  try {
    const now = new Date();
    await Promise.all([
      db
        .update(signups)
        .set({ firstName: redactedName, lastName: redactedName, email: redactedEmail, updatedAt: now })
        .where(inArray(signups.id, ids)),
      db.update(answers).set({ answer: redactedAnswer, updatedAt: now }).where(inArray(answers.signupId, ids)),
    ]);
  } catch (error) {
    console.error("Error anonymizing signups:", error);
  }
}

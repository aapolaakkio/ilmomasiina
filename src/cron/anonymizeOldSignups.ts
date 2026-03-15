/* eslint-disable no-console */
import { inArray } from "drizzle-orm";

import { env } from "@/env";
import { db } from "../db";
import { answers, signups } from "../db/schema";
import { createDebugLogger } from "../util/debug";

const redactedName = "Deleted";
const redactedEmail = "deleted@gdpr.invalid";
const redactedAnswer = "Deleted";

const debugLog = createDebugLogger("app:cron:anonymize");

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
    debugLog("No old signups to redact");
    return;
  }

  const ids = oldSignups.map((s) => s.id);
  console.info(`Redacting older signups: ${ids.join(", ")}`);

  try {
    await db
      .update(signups)
      .set({ firstName: redactedName, lastName: redactedName, email: redactedEmail, updatedAt: new Date() })
      .where(inArray(signups.id, ids));
    await db
      .update(answers)
      .set({ answer: redactedAnswer, updatedAt: new Date() })
      .where(inArray(answers.signupId, ids));
    debugLog("Signups anonymized");
  } catch (error) {
    console.error(error);
  }
}

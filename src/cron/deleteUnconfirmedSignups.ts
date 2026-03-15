/* eslint-disable no-console */
import { inArray } from "drizzle-orm";

import { db } from "../db";
import { activeSignupCutoff } from "../db/filters";
import { signups } from "../db/schema";
import {
  fetchActiveQuotasForEvent,
  fetchActiveSignupsForEvent,
  handlePositionSideEffects,
} from "../services/signups/computeSignupPosition";
import { createDebugLogger } from "../util/debug";

const debugLog = createDebugLogger("app:cron:unconfirmed");

export default async function deleteUnconfirmedSignups() {
  const cutoff = activeSignupCutoff();

  const unconfirmed = await db.query.signups.findMany({
    where: {
      confirmedAt: { isNull: true },
      createdAt: { lt: cutoff },
    },
    columns: { id: true },
    with: {
      quota: {
        columns: {},
        with: {
          event: { columns: { id: true, openQuotaSize: true } },
        },
      },
    },
  });

  if (unconfirmed.length === 0) {
    debugLog("No unconfirmed signups to delete");
    return;
  }

  // Extract event info, filtering out signups with missing relations
  const eventMap = new Map<string, number>();
  for (const s of unconfirmed) {
    const event = s.quota?.event;
    if (event) eventMap.set(event.id, event.openQuotaSize);
  }

  const signupIds = unconfirmed.map((s) => s.id);
  const uniqueEventIds = [...eventMap.keys()];

  console.info(`Deleting unconfirmed signups: ${signupIds.join(", ")}`);
  try {
    // Snapshot per event before deleting
    const snapshots = new Map<
      string,
      {
        signups: { id: string; quotaId: string }[];
        quotas: { id: string; size: number | null }[];
        openQuotaSize: number;
      }
    >();
    for (const eventId of uniqueEventIds) {
      // eslint-disable-next-line no-await-in-loop
      const prevSignups = await fetchActiveSignupsForEvent(eventId);
      // eslint-disable-next-line no-await-in-loop
      const prevQuotas = await fetchActiveQuotasForEvent(eventId);
      snapshots.set(eventId, {
        signups: prevSignups.map((s) => ({ id: s.id, quotaId: s.quotaId })),
        quotas: prevQuotas,
        openQuotaSize: eventMap.get(eventId) ?? 0,
      });
    }

    await db.delete(signups).where(inArray(signups.id, signupIds));

    for (const eventId of uniqueEventIds) {
      const snapshot = snapshots.get(eventId);
      if (!snapshot) continue;
      // eslint-disable-next-line no-await-in-loop
      await db.transaction(async (tx) => {
        await handlePositionSideEffects(eventId, tx, {
          previousSignups: snapshot.signups,
          previousQuotas: snapshot.quotas,
          previousOpenQuotaSize: snapshot.openQuotaSize,
        });
      });
    }
    debugLog("Unconfirmed signups deleted");
  } catch (error) {
    console.error(error);
  }
}

import { inArray } from "drizzle-orm";

import { db } from "../db";
import { activeSignupCutoff } from "../db/filters";
import { EventID, signups } from "../db/schema";
import {
  fetchActiveQuotasForEvent,
  fetchActiveSignupsForEvent,
  handlePositionSideEffects,
} from "../services/signups/computeSignupPosition";

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
    return;
  }

  // Extract event info, filtering out signups with missing relations
  const eventMap = new Map<EventID, number>();
  for (const s of unconfirmed) {
    const event = s.quota?.event;
    if (event) eventMap.set(event.id, event.openQuotaSize);
  }

  const signupIds = unconfirmed.map((s) => s.id);
  const uniqueEventIds = [...eventMap.keys()];

  console.info(`Deleting unconfirmed signups: ${signupIds.join(", ")}`);
  try {
    // Snapshot per event before deleting
    // Snapshot all events in parallel before deleting
    const snapshotEntries = await Promise.all(
      uniqueEventIds.map(async (eventId) => {
        const [prevSignups, prevQuotas] = await Promise.all([
          fetchActiveSignupsForEvent(eventId),
          fetchActiveQuotasForEvent(eventId),
        ]);
        return [
          eventId,
          {
            signups: prevSignups.map((s) => ({ id: s.id, quotaId: s.quotaId })),
            quotas: prevQuotas,
            openQuotaSize: eventMap.get(eventId) ?? 0,
          },
        ] as const;
      }),
    );
    const snapshots = new Map(snapshotEntries);

    await db.delete(signups).where(inArray(signups.id, signupIds));

    for (const eventId of uniqueEventIds) {
      const snapshot = snapshots.get(eventId);
      if (!snapshot) continue;
      await db.transaction(async (tx) => {
        await handlePositionSideEffects(eventId, tx, {
          previousSignups: snapshot.signups,
          previousQuotas: snapshot.quotas,
          previousOpenQuotaSize: snapshot.openQuotaSize,
        });
      });
    }
  } catch (error) {
    console.error("Error deleting unconfirmed signups:", error);
  }
}

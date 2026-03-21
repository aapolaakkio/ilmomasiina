import { inArray } from "drizzle-orm";

import { db } from "../db";
import { activeSignupCutoff } from "../db/filters";
import { EventID, signups } from "../db/schema";
import { handlePositionSideEffects } from "../services/signups/computeSignupPosition";

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
    const cutoff = activeSignupCutoff();
    const snapshotEntries = await Promise.all(
      uniqueEventIds.map(async (eventId) => {
        const eventRow = await db.query.events.findFirst({
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
        });
        if (!eventRow) return null;
        return [
          eventId,
          {
            signups: eventRow.quotas.flatMap((q) => q.signups.map((s) => ({ id: s.id, quotaId: s.quotaId }))),
            quotas: eventRow.quotas.map((q) => ({ id: q.id, size: q.size })),
            openQuotaSize: eventRow.openQuotaSize,
          },
        ] as const;
      }),
    );
    const snapshots = new Map(snapshotEntries.filter((e) => e !== null));

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

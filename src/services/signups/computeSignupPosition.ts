import { and, asc, eq, gt, isNotNull, isNull, or } from "drizzle-orm";

import { AuditEvent, SignupStatus } from "@/models";

import { internalAuditLogger } from "../../auditlog";
import { type DrizzleDb, db } from "../../db";
import { activeSignupCutoff } from "../../db/filters";
import { quotas, signups } from "../../db/schema";
import { sendPromotedFromQueueMail } from "../../mail/signups";
import { WouldMoveSignupsToQueue } from "../admin/events/errors";
import { type QuotaForPositioning, type SignupForPositioning, assignSignupPositions } from "./assignSignupPositions";

interface ActiveSignupRow {
  id: string;
  quotaId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  language: string | null;
}

/** Fetches active signups for an event, ordered by (createdAt, id). */
export async function fetchActiveSignupsForEvent(eventId: string, txOrDb: DrizzleDb = db): Promise<ActiveSignupRow[]> {
  const cutoff = activeSignupCutoff();
  return txOrDb
    .select({
      id: signups.id,
      quotaId: signups.quotaId,
      firstName: signups.firstName,
      lastName: signups.lastName,
      email: signups.email,
      language: signups.language,
    })
    .from(signups)
    .innerJoin(quotas, eq(signups.quotaId, quotas.id))
    .where(
      and(
        eq(quotas.eventId, eventId),
        isNull(signups.deletedAt),
        or(isNotNull(signups.confirmedAt), gt(signups.createdAt, cutoff)),
      ),
    )
    .orderBy(asc(signups.createdAt), asc(signups.id));
}

/** Fetches active quotas for an event. */
export async function fetchActiveQuotasForEvent(
  eventId: string,
  txOrDb: DrizzleDb = db,
): Promise<QuotaForPositioning[]> {
  return txOrDb
    .select({ id: quotas.id, size: quotas.size })
    .from(quotas)
    .where(and(eq(quotas.eventId, eventId), isNull(quotas.deletedAt)));
}

/**
 * Detects position changes (promotions, demotions) after a mutation and handles side effects.
 * Does NOT write status/position to DB.
 */
export async function handlePositionSideEffects(
  eventId: string,
  tx: DrizzleDb,
  options: {
    moveSignupsToQueue?: boolean;
    previousSignups: SignupForPositioning[];
    previousQuotas: QuotaForPositioning[];
    previousOpenQuotaSize: number;
  },
): Promise<void> {
  // Compute old positions from the snapshot
  const oldPositions = assignSignupPositions(
    options.previousSignups,
    options.previousQuotas,
    options.previousOpenQuotaSize,
  );

  // Fetch current state
  const currentSignups = await fetchActiveSignupsForEvent(eventId, tx);
  const currentQuotas = await fetchActiveQuotasForEvent(eventId, tx);
  const event = await tx.query.events.findFirst({
    where: { id: eventId },
    columns: { openQuotaSize: true, title: true },
  });
  if (!event) throw new Error("event missing from DB");

  // Compute new positions
  const newPositions = assignSignupPositions(currentSignups, currentQuotas, event.openQuotaSize);

  // Check for demotions (moved to queue)
  if (options.moveSignupsToQueue === false) {
    let movedToQueue = 0;
    for (const [signupId, newPos] of newPositions) {
      const oldPos = oldPositions.get(signupId);
      if (newPos.status === SignupStatus.IN_QUEUE && oldPos && oldPos.status !== SignupStatus.IN_QUEUE) {
        movedToQueue += 1;
      }
    }
    if (movedToQueue > 0) {
      throw new WouldMoveSignupsToQueue(movedToQueue);
    }
  }

  // Detect promotions (moved out of queue)
  const promoted = currentSignups.filter((signup) => {
    const oldPos = oldPositions.get(signup.id);
    const newPos = newPositions.get(signup.id);
    return oldPos?.status === SignupStatus.IN_QUEUE && newPos && newPos.status !== SignupStatus.IN_QUEUE;
  });

  if (promoted.length > 0) {
    await Promise.all(
      promoted.map(async (signup) => {
        const pos = newPositions.get(signup.id)!;
        await sendPromotedFromQueueMail({ ...signup, status: pos.status, position: pos.position });
        await internalAuditLogger(AuditEvent.PROMOTE_SIGNUP, {
          signup: { id: signup.id, firstName: signup.firstName, lastName: signup.lastName },
          event: { id: eventId, title: event.title },
          tx,
        });
      }),
    );
  }
}

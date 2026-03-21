import { AuditEvent, EventID, SignupStatus } from "@/db/schema";

import { internalAuditLogger } from "../../auditlog";
import { type DrizzleDb } from "../../db";
import { activeSignupCutoff } from "../../db/filters";
import { sendPromotedFromQueueMail } from "../../mail/signups";
import { WouldMoveSignupsToQueue } from "../admin/events/errors";
import {
  type QuotaForPositioning,
  type SignupForPositioning,
  assignSignupPositions,
  computePositionsFromEvent,
} from "./assignSignupPositions";

/**
 * Detects position changes (promotions, demotions) after a mutation and handles side effects.
 * Does NOT write status/position to DB.
 */
export async function handlePositionSideEffects(
  eventId: EventID,
  tx: DrizzleDb,
  options: {
    moveSignupsToQueue?: boolean;
    previousSignups: SignupForPositioning[];
    previousQuotas: QuotaForPositioning[];
    previousOpenQuotaSize: number;
  },
) {
  // Compute old positions from the snapshot
  const oldPositions = assignSignupPositions(
    options.previousSignups,
    options.previousQuotas,
    options.previousOpenQuotaSize,
  );

  const cutoff = activeSignupCutoff();

  // Single relational load: event + languages + active quotas + active signups with payments
  const eventRow = await tx.query.events.findFirst({
    where: { id: { eq: eventId } },
    columns: {
      openQuotaSize: true,
      title: true,
      deletedAt: true,
      location: true,
      verificationEmail: true,
      date: true,
      payments: true,
    },
    with: {
      languages: {
        columns: { language: true, title: true, location: true, verificationEmail: true },
      },
      quotas: {
        where: { deletedAt: { isNull: true } },
        orderBy: { order: "asc" },
        columns: { id: true, size: true },
        with: {
          signups: {
            where: {
              deletedAt: { isNull: true },
              OR: [{ confirmedAt: { isNotNull: true } }, { createdAt: { gt: cutoff } }],
            },
            orderBy: { createdAt: "asc" },
            columns: {
              id: true,
              quotaId: true,
              createdAt: true,
              firstName: true,
              lastName: true,
              email: true,
              language: true,
            },
            with: {
              payments: { columns: { status: true } },
            },
          },
        },
      },
    },
  });
  if (!eventRow) throw new Error("event missing from DB");

  const newPositions = computePositionsFromEvent({
    openQuotaSize: eventRow.openQuotaSize,
    quotas: eventRow.quotas.map((q) => ({
      id: q.id,
      size: q.size,
      signups: q.signups.map((s) => ({
        id: s.id,
        quotaId: s.quotaId,
        createdAt: s.createdAt,
      })),
    })),
  });

  const currentSignups = eventRow.quotas
    .flatMap((q) =>
      q.signups.map((s) => ({
        id: s.id,
        quotaId: s.quotaId,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        language: s.language,
        payments: s.payments,
        createdAt: s.createdAt,
      })),
    )
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
    .map(({ createdAt: _c, ...row }) => row);

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
        await sendPromotedFromQueueMail(
          {
            ...signup,
            status: pos.status,
            position: pos.position,
          },
          eventRow,
        );
        await internalAuditLogger(AuditEvent.PROMOTE_SIGNUP, {
          signup: {
            id: signup.id,
            firstName: signup.firstName,
            lastName: signup.lastName,
          },
          event: { id: eventId, title: eventRow.title },
          tx,
        });
      }),
    );
  }
}

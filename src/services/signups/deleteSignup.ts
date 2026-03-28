import { and, eq, gt, isNotNull, isNull, or } from "drizzle-orm";

import { AuditEvent, type SignupID } from "@/db/schema";

import type { AuditLogger } from "../../auditlog";
import { db } from "../../db";
import { activeSignupCutoff } from "../../db/filters";
import { events, quotas, signups } from "../../db/schema";
import { checkForConflictingPaymentsForSignupUpdate, expireExistingPaymentsForSignupUpdate } from "../payment/stripe";
import { handlePositionSideEffects } from "./computeSignupPosition";
import { NoSuchSignup, SignupsClosed } from "./errors";
import { signupEditable } from "./helpers";

/** Delete a signup. Set `admin` to true to bypass editability checks and payment restrictions. */
export async function deleteSignup(id: SignupID, auditLogger: AuditLogger, admin: boolean = false) {
  await expireExistingPaymentsForSignupUpdate(id);

  const cutoff = activeSignupCutoff();

  const { eventId } = await db.transaction(async (tx) => {
    // Lock the signup and fetch event data in a single JOIN query
    const [row] = await tx
      .select({
        id: signups.id,
        createdAt: signups.createdAt,
        confirmedAt: signups.confirmedAt,
        firstName: signups.firstName,
        lastName: signups.lastName,
        eventId: events.id,
        registrationStartDate: events.registrationStartDate,
        registrationEndDate: events.registrationEndDate,
        openQuotaSize: events.openQuotaSize,
      })
      .from(signups)
      .innerJoin(quotas, eq(signups.quotaId, quotas.id))
      .innerJoin(events, eq(quotas.eventId, events.id))
      .where(
        and(
          eq(signups.id, id),
          isNull(signups.deletedAt),
          or(isNotNull(signups.confirmedAt), gt(signups.createdAt, cutoff)),
        ),
      )
      .for("update");

    if (!row) throw new NoSuchSignup("No signup found with id");

    const signup = {
      id: row.id,
      createdAt: row.createdAt,
      confirmedAt: row.confirmedAt,
      firstName: row.firstName,
      lastName: row.lastName,
    };
    const event = {
      id: row.eventId,
      registrationStartDate: row.registrationStartDate,
      registrationEndDate: row.registrationEndDate,
      openQuotaSize: row.openQuotaSize,
    };

    await checkForConflictingPaymentsForSignupUpdate(id, tx, admin);

    if (
      !admin &&
      !signupEditable(
        { registrationStartDate: event.registrationStartDate, registrationEndDate: event.registrationEndDate },
        signup,
      )
    ) {
      throw new SignupsClosed("Signups closed for this event.");
    }

    // Snapshot current state before delete (single relational query)
    const eventRow = await tx.query.events.findFirst({
      where: { id: { eq: event.id } },
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
    if (!eventRow) throw new Error("event missing from DB");

    const previousQuotas = eventRow.quotas.map((q) => ({ id: q.id, size: q.size }));
    const previousSignups = eventRow.quotas.flatMap((q) => q.signups.map((s) => ({ id: s.id, quotaId: s.quotaId })));

    // Soft delete
    await tx.update(signups).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(signups.id, id));

    await auditLogger(AuditEvent.DELETE_SIGNUP, {
      signup: { id: signup.id, firstName: signup.firstName, lastName: signup.lastName },
      tx,
    });

    // Detect promotions after delete
    await handlePositionSideEffects(event.id, tx, {
      previousSignups,
      previousQuotas,
      previousOpenQuotaSize: event.openQuotaSize,
    });

    return { eventId: event.id };
  });

  return { eventId };
}

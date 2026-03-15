import { and, eq, gt, isNotNull, isNull, or } from "drizzle-orm";

import type { SignupID } from "@/models";
import { AuditEvent } from "@/models";

import type { AuditLogger } from "../../auditlog";
import { db } from "../../db";
import { activeSignupCutoff } from "../../db/filters";
import { signups } from "../../db/schema";
import { checkForConflictingPaymentsForSignupUpdate, expireExistingPaymentsForSignupUpdate } from "../payment/stripe";
import {
  fetchActiveQuotasForEvent,
  fetchActiveSignupsForEvent,
  handlePositionSideEffects,
} from "./computeSignupPosition";
import { NoSuchSignup, SignupsClosed } from "./errors";
import { signupEditable } from "./helpers";

/** Delete a signup. Set `admin` to true to bypass editability checks and payment restrictions. */
// eslint-disable-next-line import/prefer-default-export
export async function deleteSignup(id: SignupID, auditLogger: AuditLogger, admin: boolean = false): Promise<void> {
  await expireExistingPaymentsForSignupUpdate(id);

  const cutoff = activeSignupCutoff();

  await db.transaction(async (tx) => {
    // Lock the signup (FOR UPDATE stays as db.select)
    const [signup] = await tx
      .select({
        id: signups.id,
        createdAt: signups.createdAt,
        confirmedAt: signups.confirmedAt,
        firstName: signups.firstName,
        lastName: signups.lastName,
      })
      .from(signups)
      .where(
        and(
          eq(signups.id, id),
          isNull(signups.deletedAt),
          or(isNotNull(signups.confirmedAt), gt(signups.createdAt, cutoff)),
        ),
      )
      .for("update");

    if (!signup) throw new NoSuchSignup("No signup found with id");

    await checkForConflictingPaymentsForSignupUpdate(id, tx, admin);

    // Get quota and event via relational query
    const signupWithEvent = await tx.query.signups.findFirst({
      where: { id },
      columns: {},
      with: {
        quota: {
          columns: { id: true },
          with: {
            event: {
              columns: {
                id: true,
                registrationStartDate: true,
                registrationEndDate: true,
                openQuotaSize: true,
              },
            },
          },
        },
      },
    });

    if (!signupWithEvent?.quota?.event) throw new NoSuchSignup("Signup expired or already deleted");
    const event = signupWithEvent.quota.event;

    if (
      !admin &&
      !signupEditable(
        { registrationStartDate: event.registrationStartDate, registrationEndDate: event.registrationEndDate },
        signup,
      )
    ) {
      throw new SignupsClosed("Signups closed for this event.");
    }

    // Snapshot current state before delete
    const previousSignups = await fetchActiveSignupsForEvent(event.id, tx);
    const previousQuotas = await fetchActiveQuotasForEvent(event.id, tx);

    // Soft delete
    await tx.update(signups).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(signups.id, id));

    await auditLogger(AuditEvent.DELETE_SIGNUP, {
      signup: { id: signup.id, firstName: signup.firstName, lastName: signup.lastName },
      tx,
    });

    // Detect promotions after delete
    await handlePositionSideEffects(event.id, tx, {
      previousSignups: previousSignups.map((s) => ({ id: s.id, quotaId: s.quotaId })),
      previousQuotas,
      previousOpenQuotaSize: event.openQuotaSize,
    });
  });
}

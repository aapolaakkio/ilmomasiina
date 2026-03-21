import { AuditEvent } from "@/db/schema";
import type { SignupCreateBody } from "@/db/zod";

import type { AuditLogger } from "../../auditlog";
import { env } from "@/env";
import { db } from "../../db";
import { signups } from "../../db/schema";
import { generateToken } from "./editTokens";
import { NoSuchQuota, SignupsClosed } from "./errors";
import { signupsAllowed } from "./helpers";

/** Returns true if event matches userEventWhere conditions. */
function isUserVisibleEvent(event: {
  draft: boolean;
  registrationEndDate: Date | null;
  date: Date | null;
  endDate: Date | null;
}) {
  if (event.draft) return false;
  const cutoff = new Date(Date.now() - env.HIDE_EVENT_AFTER_DAYS * 24 * 60 * 60 * 1000);
  return (
    (event.registrationEndDate != null && event.registrationEndDate > cutoff) ||
    (event.date != null && event.date > cutoff) ||
    (event.endDate != null && event.endDate > cutoff)
  );
}

/** Create a new signup for a quota. Returns the signup ID and edit token. */
export async function createSignup(body: SignupCreateBody, auditLogger: AuditLogger) {
  const { newSignup } = await db.transaction(async (tx) => {
    // Find the quota with its event
    const quotaData = await tx.query.quotas.findFirst({
      where: { id: { eq: body.quotaId }, deletedAt: { isNull: true } },
      with: {
        event: {
          columns: {
            id: true,
            title: true,
            draft: true,
            date: true,
            endDate: true,
            registrationStartDate: true,
            registrationEndDate: true,
          },
        },
      },
    });

    if (!quotaData?.event || !isUserVisibleEvent(quotaData.event)) {
      throw new NoSuchQuota("Quota doesn't exist.");
    }

    const event = quotaData.event;
    if (
      !signupsAllowed({
        registrationStartDate: event.registrationStartDate,
        registrationEndDate: event.registrationEndDate,
      })
    ) {
      throw new SignupsClosed("Signups closed for this event.");
    }

    const [signup] = await tx.insert(signups).values({ quotaId: body.quotaId }).returning({ id: signups.id });

    await auditLogger(AuditEvent.CREATE_SIGNUP, {
      signup: { id: signup.id },
      event: { id: event.id, title: event.title },
      tx,
    });

    return { newSignup: signup };
  });

  const editToken = generateToken(newSignup.id);
  return { id: newSignup.id, editToken };
}

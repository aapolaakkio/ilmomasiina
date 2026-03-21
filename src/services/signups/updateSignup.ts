import { and, eq, gt, isNotNull, isNull, or } from "drizzle-orm";

import { AuditEvent, type SignupID } from "@/db/schema";
import type { AdminSignupCreateBody, AdminSignupUpdateBody, SignupUpdateBody } from "@/db/zod";

import type { AuditLogger } from "../../auditlog";
import { type DrizzleDb, db } from "../../db";
import { getEffectivePaymentStatus, isConfirmed } from "../../db/computed";
import { activeSignupCutoff } from "../../db/filters";
import { signups } from "../../db/schema";
import { sendSignupConfirmationMail } from "../../mail/signups";
import { formatSignupForAdmin } from "../events/getEventDetails";
import { expireExistingPaymentsForSignupUpdate } from "../payment/stripe";
import { computePositionsFromEvent } from "./assignSignupPositions";
import { NoSuchQuota, NoSuchSignup, SignupsClosed } from "./errors";
import { signupEditable } from "./helpers";
import { updateExistingSignup } from "./updateSignupLogic";

async function getSignupAndEventForUpdate(id: SignupID, tx: DrizzleDb) {
  // Locked read stays as db.select() for FOR UPDATE support
  const [signup] = await tx
    .select()
    .from(signups)
    .where(
      and(
        eq(signups.id, id),
        isNull(signups.deletedAt),
        or(isNotNull(signups.confirmedAt), gt(signups.createdAt, activeSignupCutoff())),
      ),
    )
    .for("update");

  if (!signup) throw new NoSuchSignup("Signup expired or already deleted");

  // Fetch quota + event + questions + languages
  const quotaData = await tx.query.quotas.findFirst({
    where: { id: { eq: signup.quotaId } },
    with: {
      event: {
        with: {
          questions: {
            where: { deletedAt: { isNull: true } },
            orderBy: { order: "asc" },
            with: { languages: true },
          },
        },
      },
    },
  });

  if (!quotaData?.event) throw new NoSuchSignup("Signup expired or already deleted");

  const { event } = quotaData;

  // Flatten question languages for updateExistingSignup
  const questionLangRows = event.questions.flatMap((q) => q.languages);

  return {
    signup,
    quota: { ...quotaData, title: quotaData.title },
    event: { ...event, title: event.title, questions: event.questions },
    questionLangRows,
  };
}

/** Re-fetch a signup with answers, payments, position, and mail-related data (quota/event/questions with languages). */
async function refetchSignupWithPosition(signupId: SignupID) {
  const signup = await db.query.signups.findFirst({
    where: { id: { eq: signupId } },
    columns: {
      id: true,
      quotaId: true,
      firstName: true,
      lastName: true,
      namePublic: true,
      email: true,
      language: true,
      manualPaymentStatus: true,
      createdAt: true,
      confirmedAt: true,
      deletedAt: true,
      price: true,
      currency: true,
      products: true,
    },
    with: {
      answers: true,
      payments: { columns: { status: true } },
      quota: {
        columns: { title: true },
        with: {
          languages: { columns: { language: true, title: true } },
          event: {
            columns: {
              deletedAt: true,
              title: true,
              date: true,
              location: true,
              verificationEmail: true,
              payments: true,
              openQuotaSize: true,
            },
            with: {
              languages: {
                columns: { language: true, title: true, location: true, verificationEmail: true },
              },
              questions: {
                where: { deletedAt: { isNull: true } },
                orderBy: { order: "asc" },
                columns: { id: true, question: true, options: true },
                with: { languages: { columns: { language: true, question: true, options: true } } },
              },
              quotas: {
                where: { deletedAt: { isNull: true } },
                columns: { id: true, size: true },
                with: {
                  signups: {
                    where: {
                      deletedAt: { isNull: true },
                      OR: [{ confirmedAt: { isNotNull: true } }, { createdAt: { gt: activeSignupCutoff() } }],
                    },
                    orderBy: { createdAt: "asc" },
                    columns: { id: true, quotaId: true, createdAt: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!signup?.quota?.event) throw new NoSuchSignup("Signup not found after update");

  const event = signup.quota.event;
  const positionMap = computePositionsFromEvent(event);
  const pos = positionMap.get(signupId);

  return {
    ...signup,
    quota: signup.quota,
    event,
    status: pos?.status ?? null,
    position: pos?.position ?? null,
  };
}

/** Update a signup as the user who created it. */
export async function updateSignupAsUser(signupId: SignupID, body: SignupUpdateBody, auditLogger: AuditLogger) {
  await expireExistingPaymentsForSignupUpdate(signupId);

  const { updatedSignupId, wasConfirmed } = await db.transaction(async (tx) => {
    const { signup, quota, event, questionLangRows } = await getSignupAndEventForUpdate(signupId, tx);

    if (!signupEditable(event, signup)) {
      throw new SignupsClosed("Signups closed for this event.");
    }

    const confirmed = isConfirmed(signup);
    await updateExistingSignup(signup, event, quota, questionLangRows, body, tx, false);
    await auditLogger(AuditEvent.EDIT_SIGNUP, {
      signup: {
        id: signup.id,
        firstName: signup.firstName,
        lastName: signup.lastName,
      },
      event: { id: event.id, title: event.title },
      tx,
    });

    return { updatedSignupId: signup.id, wasConfirmed: confirmed };
  });

  const updated = await refetchSignupWithPosition(updatedSignupId);

  await sendSignupConfirmationMail(
    { ...updated, payments: updated.payments },
    wasConfirmed ? "edit" : "signup",
    false,
    { quota: updated.quota, event: updated.event },
  );

  const response = {
    ...updated,
    confirmed: isConfirmed(updated),
    answers: updated.answers,
    paymentStatus: getEffectivePaymentStatus(updated, updated.payments),
  };
  return response;
}

/** Update a signup as an admin. */
export async function updateSignupAsAdmin(
  signupId: SignupID,
  body: AdminSignupUpdateBody,
  auditLogger: AuditLogger,
  sendEmail: boolean = true,
) {
  await expireExistingPaymentsForSignupUpdate(signupId);

  await db.transaction(async (tx) => {
    const { signup, quota, event, questionLangRows } = await getSignupAndEventForUpdate(signupId, tx);
    await updateExistingSignup(signup, event, quota, questionLangRows, body, tx, true);
    await auditLogger(AuditEvent.EDIT_SIGNUP, {
      signup: {
        id: signup.id,
        firstName: signup.firstName,
        lastName: signup.lastName,
      },
      event: { id: event.id, title: event.title },
      tx,
    });
  });

  const updated = await refetchSignupWithPosition(signupId);

  if (sendEmail) {
    await sendSignupConfirmationMail({ ...updated, payments: updated.payments }, "edit", true, {
      quota: updated.quota,
      event: updated.event,
    });
  }

  return formatSignupForAdmin(updated, updated.answers, updated.payments);
}

/** Create a signup as an admin. */
export async function createSignupAsAdmin(
  body: AdminSignupCreateBody,
  auditLogger: AuditLogger,
  sendEmail: boolean = true,
) {
  const signupId = await db.transaction(async (tx) => {
    // Single relational query for quota + event + questions + languages
    const quotaData = await tx.query.quotas.findFirst({
      where: { id: { eq: body.quotaId } },
      with: {
        event: {
          with: {
            questions: {
              where: { deletedAt: { isNull: true } },
              orderBy: { order: "asc" },
              with: { languages: true },
            },
          },
        },
      },
    });

    if (!quotaData || !quotaData.event) throw new NoSuchQuota("Quota doesn't exist.");

    const { event } = quotaData;
    const questionLangRows = event.questions.flatMap((q) => q.languages);

    const [newSignup] = await tx.insert(signups).values({ quotaId: quotaData.id }).returning();

    await updateExistingSignup(
      newSignup,
      { ...event, questions: event.questions },
      { ...quotaData, title: quotaData.title },
      questionLangRows,
      body,
      tx,
      true,
    );
    await auditLogger(AuditEvent.CREATE_SIGNUP, {
      signup: { id: newSignup.id },
      event: { id: event.id, title: event.title },
      tx,
    });

    return newSignup.id;
  });

  const updated = await refetchSignupWithPosition(signupId);

  if (sendEmail) {
    await sendSignupConfirmationMail({ ...updated, payments: updated.payments }, "signup", true, {
      quota: updated.quota,
      event: updated.event,
    });
  }

  return formatSignupForAdmin(updated, updated.answers, updated.payments);
}

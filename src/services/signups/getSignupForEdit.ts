import type { SignupID } from "@/db/schema";
import { db } from "../../db";
import {
  getConfirmableUntil,
  getEditableAtLeastUntil,
  getEffectivePaymentStatus,
  isConfirmed,
} from "../../db/computed";
import { activeSignupCutoff } from "../../db/filters";
import { reconstructEventLanguages } from "../../db/helpers";
import { computePositionsFromEvent } from "./assignSignupPositions";
import { NoSuchSignup } from "./errors";

/** Get a signup for editing by its ID. Caller must verify the edit token. */
export async function getSignupForEdit(signupId: SignupID) {
  const cutoff = activeSignupCutoff();

  // Single round trip: signup (answers, payments) + full event graph for positions
  const signupRow = await db.query.signups.findFirst({
    columns: {
      id: true,
      quotaId: true,
      firstName: true,
      lastName: true,
      namePublic: true,
      email: true,
      language: true,
      confirmedAt: true,
      createdAt: true,
      price: true,
      currency: true,
      products: true,
      manualPaymentStatus: true,
      deletedAt: true,
    },
    where: {
      id: { eq: signupId },
      deletedAt: { isNull: true },
      OR: [{ confirmedAt: { isNotNull: true } }, { createdAt: { gt: cutoff } }],
    },
    with: {
      answers: true,
      payments: { columns: { status: true } },
      quota: {
        with: {
          event: {
            columns: {
              id: true,
              slug: true,
              title: true,
              description: true,
              price: true,
              location: true,
              webpageUrl: true,
              verificationEmail: true,
              date: true,
              endDate: true,
              registrationStartDate: true,
              registrationEndDate: true,
              openQuotaSize: true,
              category: true,
              draft: true,
              listed: true,
              signupsPublic: true,
              nameQuestion: true,
              emailQuestion: true,
              payments: true,
              defaultLanguage: true,
            },
            with: {
              languages: true,
              questions: {
                where: { deletedAt: { isNull: true } },
                orderBy: { order: "asc" },
                with: { languages: true },
              },
              quotas: {
                where: { deletedAt: { isNull: true } },
                orderBy: { order: "asc" },
                with: {
                  languages: true,
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

  if (!signupRow?.quota?.event) throw new NoSuchSignup("Signup expired or already deleted");

  const eventRow = signupRow.quota.event;

  // Reconstruct language fields
  const langFields = reconstructEventLanguages(
    eventRow,
    eventRow.languages,
    eventRow.quotas,
    eventRow.questions,
    false,
  );

  // Compute positions on-the-fly
  const positionMap = computePositionsFromEvent(eventRow);
  const signupPos = positionMap.get(signupRow.id);

  // The signup's own quota title (directly from main table)
  const signupQuota = eventRow.quotas.find((q) => q.id === signupRow.quotaId);
  const signupQuotaTitle = signupQuota?.title ?? "";

  // Compute editable/confirmable durations
  let editableForMillis = 0;
  const now = Date.now();
  if (eventRow.registrationEndDate != null) {
    editableForMillis = Math.max(
      0,
      eventRow.registrationEndDate.getTime() - now,
      getEditableAtLeastUntil(signupRow).getTime() - now,
    );
  }
  const confirmableForMillis = signupRow.confirmedAt ? 0 : Math.max(0, getConfirmableUntil(signupRow).getTime() - now);

  const response = {
    signup: {
      ...signupRow,
      status: signupPos?.status ?? null,
      position: signupPos?.position ?? null,
      confirmed: isConfirmed(signupRow),
      answers: signupRow.answers,
      quota: { ...signupRow.quota, title: signupQuotaTitle },
      paymentStatus: getEffectivePaymentStatus(signupRow, signupRow.payments),
      confirmableForMillis,
      editableForMillis,
    },
    event: {
      ...eventRow,
      ...langFields,
    },
  };

  return response;
}

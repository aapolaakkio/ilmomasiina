import type { SignupForEditResponse, SignupID } from "@/models";

import { db } from "../../db";
import {
  getConfirmableUntil,
  getEditableAtLeastUntil,
  getEffectivePaymentStatus,
  isConfirmed,
} from "../../db/computed";
import { activeSignupCutoff } from "../../db/filters";
import { reconstructEventLanguages } from "../../db/helpers";
import { assignSignupPositions } from "./assignSignupPositions";
import { NoSuchSignup } from "./errors";

/** Get a signup for editing by its ID. Caller must verify the edit token. */
// eslint-disable-next-line import/prefer-default-export
export async function getSignupForEdit(signupId: SignupID): Promise<SignupForEditResponse> {
  const cutoff = activeSignupCutoff();

  // Query 1: signup with answers, payments, and quota
  const signupRow = await db.query.signups.findFirst({
    where: {
      id: signupId,
      deletedAt: { isNull: true },
      OR: [{ confirmedAt: { isNotNull: true } }, { createdAt: { gt: cutoff } }],
    },
    with: {
      answers: true,
      payments: { columns: { status: true } },
      quota: true,
    },
  });

  if (!signupRow?.quota) throw new NoSuchSignup("Signup expired or already deleted");

  // Query 2: event with languages, questions, quotas, and signups (for position computation)
  const eventRow = await db.query.events.findFirst({
    where: { id: signupRow.quota.eventId },
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
  });

  if (!eventRow) throw new NoSuchSignup("Signup expired or already deleted");

  // Reconstruct language fields
  const langFields = reconstructEventLanguages(
    eventRow,
    eventRow.languages,
    eventRow.quotas,
    eventRow.questions,
    false,
  );

  // Compute positions on-the-fly
  const allSignups: { id: string; quotaId: string; createdAt: Date }[] = [];
  for (const q of eventRow.quotas) {
    for (const s of q.signups) {
      allSignups.push(s);
    }
  }
  allSignups.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));

  const positionMap = assignSignupPositions(
    allSignups.map((s) => ({ id: s.id, quotaId: s.quotaId })),
    eventRow.quotas.map((q) => ({ id: q.id, size: q.size })),
    eventRow.openQuotaSize,
  );
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

  return response as unknown as SignupForEditResponse;
}

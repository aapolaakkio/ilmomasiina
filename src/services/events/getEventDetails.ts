import type { AdminEventResponse, AdminSignupSchema, EventID, EventSlug, UserEventResponse } from "@/models";

import { env } from "@/env";
import { db } from "../../db";
import { getEffectiveEndDate, getEffectivePaymentStatus, isConfirmed } from "../../db/computed";
import { activeSignupCutoff } from "../../db/filters";
import { reconstructEventLanguages } from "../../db/helpers";
import { answers, signups } from "../../db/schema";
import { assignSignupPositions } from "../signups/assignSignupPositions";

async function getBasicEventInfo(eventSlug: EventSlug) {
  const event = await db.query.events.findFirst({
    where: {
      slug: eventSlug,
      deletedAt: { isNull: true },
      draft: false,
      OR: [
        { registrationEndDate: { gt: new Date(Date.now() - env.HIDE_EVENT_AFTER_DAYS * 24 * 60 * 60 * 1000) } },
        { date: { gt: new Date(Date.now() - env.HIDE_EVENT_AFTER_DAYS * 24 * 60 * 60 * 1000) } },
        { endDate: { gt: new Date(Date.now() - env.HIDE_EVENT_AFTER_DAYS * 24 * 60 * 60 * 1000) } },
      ],
    },
    with: {
      questions: {
        where: { deletedAt: { isNull: true } },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!event) throw new Error("No event found with slug");

  const publicQuestionIds = event.questions.filter((q) => q.public).map((q) => q.id);

  return {
    event: { ...event, effectiveEndDate: getEffectiveEndDate(event) },
    publicQuestions: publicQuestionIds,
  };
}

async function getEventDetailsForUser(eventSlug: EventSlug) {
  const { event, publicQuestions } = await getBasicEventInfo(eventSlug);

  const effectiveEnd = event.effectiveEndDate;
  const isOld = effectiveEnd != null && effectiveEnd < Date.now() - 7 * 86_400_000;

  // Fetch full event with languages, quotas (with languages + signups if not old)
  const fullEvent = await db.query.events.findFirst({
    where: { id: event.id },
    with: {
      languages: true,
      quotas: {
        where: { deletedAt: { isNull: true } },
        orderBy: { order: "asc" },
        with: {
          languages: true,
          ...(isOld
            ? {}
            : {
                signups: {
                  where: {
                    deletedAt: { isNull: true },
                    OR: [{ confirmedAt: { isNotNull: true } }, { createdAt: { gt: activeSignupCutoff() } }],
                  },
                  orderBy: { createdAt: "asc" },
                  with: { answers: { where: { deletedAt: { isNull: true } } } },
                },
              }),
        },
      },
      questions: {
        where: { deletedAt: { isNull: true } },
        orderBy: { order: "asc" },
        with: { languages: true },
      },
    },
  });

  if (!fullEvent) throw new Error("No event found");

  const langFields = reconstructEventLanguages(
    fullEvent,
    fullEvent.languages,
    fullEvent.quotas,
    fullEvent.questions,
    false,
  );

  // Flatten signups across quotas for position computation
  const allSignups: (typeof signups.$inferSelect & { answers: (typeof answers.$inferSelect)[] })[] = [];
  for (const quota of fullEvent.quotas) {
    if ("signups" in quota) {
      for (const s of quota.signups as (typeof signups.$inferSelect & {
        answers: (typeof answers.$inferSelect)[];
      })[]) {
        allSignups.push(s);
      }
    }
  }
  // Sort by (createdAt, id) for position computation
  allSignups.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));

  const positionMap = assignSignupPositions(
    allSignups.map((s) => ({ id: s.id, quotaId: s.quotaId })),
    fullEvent.quotas.map((q) => ({ id: q.id, size: q.size })),
    fullEvent.openQuotaSize,
  );

  // Build quota rows with titles, signups, and counts
  const quotaRows = fullEvent.quotas.map((quota) => {
    const quotaSignups =
      "signups" in quota
        ? (quota.signups as (typeof signups.$inferSelect & { answers: (typeof answers.$inferSelect)[] })[])
        : [];

    // Filter answers to only public questions, attach computed positions
    const filteredSignups = quotaSignups.map((s) => {
      const pos = positionMap.get(s.id);
      return {
        ...s,
        status: pos?.status ?? null,
        position: pos?.position ?? null,
        answers: publicQuestions.length > 0 ? s.answers.filter((a) => publicQuestions.includes(a.questionId)) : [],
      };
    });

    return {
      ...quota,
      signups: filteredSignups,
      signupCount: filteredSignups.length,
    };
  });

  return {
    event: {
      ...event,
      ...langFields,
      quotas: quotaRows.map((quota) => ({
        ...quota,
        signups: event.signupsPublic
          ? quota.signups.map((signup) => ({
              ...signup,
              firstName: event.nameQuestion && signup.namePublic ? signup.firstName : null,
              lastName: event.nameQuestion && signup.namePublic ? signup.lastName : null,
              answers: signup.answers,
              confirmed: isConfirmed(signup),
            }))
          : [],
        signupCount: quota.signupCount,
      })),
    },
    registrationStartDate: event.registrationStartDate,
    registrationEndDate: event.registrationEndDate,
  };
}

export async function eventDetailsForUser(eventSlug: EventSlug): Promise<UserEventResponse> {
  const { event, registrationStartDate, registrationEndDate } = await getEventDetailsForUser(eventSlug);

  let registrationClosed = true;
  let millisTillOpening = null;

  if (registrationStartDate !== null && registrationEndDate !== null) {
    const now = new Date();
    millisTillOpening = Math.max(0, registrationStartDate.getTime() - now.getTime());
    registrationClosed = now > registrationEndDate;
  }

  const res = { ...event, millisTillOpening, registrationClosed };
  return res as unknown as UserEventResponse;
}

/** Converts a signup with answers to JSON for the admin API. */
export function formatSignupForAdmin(
  signup: typeof signups.$inferSelect & { status?: string | null; position?: number | null },
  signupAnswers: (typeof answers.$inferSelect)[],
  signupPayments: { status: string }[],
): AdminSignupSchema {
  return {
    ...signup,
    confirmed: isConfirmed(signup),
    answers: signupAnswers,
    paymentStatus: getEffectivePaymentStatus(signup, signupPayments),
  } as unknown as AdminSignupSchema;
}

export async function eventDetailsForAdmin(eventID: EventID): Promise<AdminEventResponse> {
  const event = await db.query.events.findFirst({
    where: { id: eventID },
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
              OR: [
                {
                  deletedAt: { isNull: true },
                  OR: [{ confirmedAt: { isNotNull: true } }, { createdAt: { gt: activeSignupCutoff() } }],
                },
                { deletedAt: { isNotNull: true } },
              ],
            },
            orderBy: { createdAt: "asc" },
            with: {
              answers: { where: { deletedAt: { isNull: true } } },
              payments: true,
            },
          },
        },
      },
    },
  });

  if (!event) throw new Error("No event found with id");

  // Reconstruct language fields
  const langFields = reconstructEventLanguages(event, event.languages, event.quotas, event.questions, true);

  // Flatten active signups for position computation (exclude deleted)
  const activeSignups: { id: string; quotaId: string; createdAt: Date }[] = [];
  for (const quota of event.quotas) {
    for (const s of quota.signups) {
      if (!s.deletedAt) {
        activeSignups.push({ id: s.id, quotaId: s.quotaId, createdAt: s.createdAt });
      }
    }
  }
  activeSignups.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));

  const positionMap = assignSignupPositions(
    activeSignups.map((s) => ({ id: s.id, quotaId: s.quotaId })),
    event.quotas.map((q) => ({ id: q.id, size: q.size })),
    event.openQuotaSize,
  );

  const res = {
    ...event,
    ...langFields,
    quotas: event.quotas.map((quota) => {
      const filteredSignups = quota.signups.filter((signup) => {
        if (!signup.deletedAt) return true;
        const paymentStatus = getEffectivePaymentStatus(signup, signup.payments);
        return paymentStatus === "paid" || paymentStatus === "refunded";
      });

      return {
        ...quota,
        signups: filteredSignups.map((signup) => {
          const pos = positionMap.get(signup.id);
          return formatSignupForAdmin(
            { ...signup, status: pos?.status ?? null, position: pos?.position ?? null },
            signup.answers,
            signup.payments,
          );
        }),
        signupCount: filteredSignups.filter((s) => !s.deletedAt).length,
      };
    }),
  };

  return res as unknown as AdminEventResponse;
}

export async function getEventBySlug(slug: EventSlug): Promise<UserEventResponse> {
  return eventDetailsForUser(slug);
}

export async function getEventByIdForAdmin(eventId: EventID): Promise<AdminEventResponse> {
  return eventDetailsForAdmin(eventId);
}

import type { EventID, SignupStatus } from "@/db/schema";
import type { EventSlug } from "@/db/zod";

import { env } from "@/env";
import { db } from "../../db";
import { getEffectiveEndDate, getEffectivePaymentStatus, isConfirmed } from "../../db/computed";
import { activeSignupCutoff } from "../../db/filters";
import { reconstructEventLanguages } from "../../db/helpers";
import { answers, signups } from "../../db/schema";
import { assignSignupPositions, computePositionsFromEvent } from "../signups/assignSignupPositions";

async function getEventDetailsForUser(eventSlug: EventSlug) {
  const hideBeforeDate = new Date(Date.now() - env.HIDE_EVENT_AFTER_DAYS * 24 * 60 * 60 * 1000);

  // Single query: fetch the event with all related data in one go
  const fullEvent = await db.query.events.findFirst({
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
    where: {
      slug: eventSlug,
      deletedAt: { isNull: true },
      draft: false,
      OR: [
        { registrationEndDate: { gt: hideBeforeDate } },
        { date: { gt: hideBeforeDate } },
        { endDate: { gt: hideBeforeDate } },
      ],
    },
    with: {
      languages: true,
      quotas: {
        where: { deletedAt: { isNull: true } },
        orderBy: { order: "asc" },
        with: {
          languages: true,
          signups: {
            columns: {
              id: true,
              quotaId: true,
              createdAt: true,
              firstName: true,
              lastName: true,
              namePublic: true,
              confirmedAt: true,
            },
            where: {
              deletedAt: { isNull: true },
              OR: [{ confirmedAt: { isNotNull: true } }, { createdAt: { gt: activeSignupCutoff() } }],
            },
            orderBy: { createdAt: "asc" },
            with: { answers: { where: { deletedAt: { isNull: true } } } },
          },
        },
      },
      questions: {
        where: { deletedAt: { isNull: true } },
        orderBy: { order: "asc" },
        with: { languages: true },
      },
    },
  });

  if (!fullEvent) throw new Error("No event found with slug");

  const event = {
    ...fullEvent,
    effectiveEndDate: getEffectiveEndDate(fullEvent),
  };
  const publicQuestions = fullEvent.questions.filter((q) => q.public).map((q) => q.id);

  // For very old events, strip signups to avoid serving stale data
  const isOld = event.effectiveEndDate != null && event.effectiveEndDate < Date.now() - 7 * 86_400_000;

  const langFields = reconstructEventLanguages(
    fullEvent,
    fullEvent.languages,
    fullEvent.quotas,
    fullEvent.questions,
    false,
  );

  // Compute positions on-the-fly (empty for old events since signups are stripped)
  const positionMap = isOld ? new Map() : computePositionsFromEvent(fullEvent);

  // Build quota rows with titles, signups, and counts
  const quotaRows = fullEvent.quotas.map((quota) => {
    const quotaSignups = isOld ? [] : quota.signups;

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

/** Slugs for published events within the same visibility window as `getEventDetailsForUser` (for `generateStaticParams`). */
export async function getPublicEventSlugsForStaticParams() {
  const hideBeforeDate = new Date(Date.now() - env.HIDE_EVENT_AFTER_DAYS * 24 * 60 * 60 * 1000);
  return db.query.events.findMany({
    where: {
      deletedAt: { isNull: true },
      draft: false,
      OR: [
        { registrationEndDate: { gt: hideBeforeDate } },
        { date: { gt: hideBeforeDate } },
        { endDate: { gt: hideBeforeDate } },
      ],
    },
    columns: { slug: true },
  });
}

export async function getEventBySlug(eventSlug: EventSlug) {
  const { event, registrationStartDate, registrationEndDate } = await getEventDetailsForUser(eventSlug);

  let registrationClosed = true;
  let millisTillOpening = null;

  if (registrationStartDate !== null && registrationEndDate !== null) {
    const now = new Date();
    millisTillOpening = Math.max(0, registrationStartDate.getTime() - now.getTime());
    registrationClosed = now > registrationEndDate;
  }

  return { ...event, millisTillOpening, registrationClosed };
}

/** Converts a signup with answers to JSON for the admin API. */
export function formatSignupForAdmin(
  signup: Pick<
    typeof signups.$inferSelect,
    | "id"
    | "firstName"
    | "lastName"
    | "namePublic"
    | "email"
    | "manualPaymentStatus"
    | "createdAt"
    | "confirmedAt"
    | "deletedAt"
    | "price"
    | "currency"
  > & {
    status: SignupStatus | null;
    position: number | null;
  },
  signupAnswers: (typeof answers.$inferSelect)[],
  signupPayments: { status: string }[],
) {
  return {
    id: signup.id,
    firstName: signup.firstName,
    lastName: signup.lastName,
    namePublic: signup.namePublic,
    email: signup.email,
    manualPaymentStatus: signup.manualPaymentStatus,
    status: signup.status,
    position: signup.position,
    createdAt: signup.createdAt,
    confirmed: isConfirmed(signup),
    deletedAt: signup.deletedAt,
    price: signup.price,
    currency: signup.currency,
    answers: signupAnswers,
    paymentStatus: getEffectivePaymentStatus(signup, signupPayments),
  };
}

export async function getEventByIdForAdmin(eventID: EventID) {
  const event = await db.query.events.findFirst({
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
      updatedAt: true,
    },
    where: { id: { eq: eventID } },
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
            columns: {
              id: true,
              quotaId: true,
              firstName: true,
              lastName: true,
              namePublic: true,
              email: true,
              manualPaymentStatus: true,
              createdAt: true,
              confirmedAt: true,
              deletedAt: true,
              price: true,
              currency: true,
            },
            with: {
              answers: { where: { deletedAt: { isNull: true } } },
              payments: { columns: { status: true } },
            },
          },
        },
      },
    },
  });

  if (!event) throw new Error("No event found with id");

  // Reconstruct language fields
  const langFields = reconstructEventLanguages(event, event.languages, event.quotas, event.questions, true);

  // Compute positions from active signups only (exclude deleted)
  const activeSignups = event.quotas
    .flatMap((q) => q.signups.filter((s) => !s.deletedAt))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));

  const positionMap = assignSignupPositions(activeSignups, event.quotas, event.openQuotaSize);

  return {
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
            {
              ...signup,
              status: pos?.status ?? null,
              position: pos?.position ?? null,
            },
            signup.answers,
            signup.payments,
          );
        }),
        signupCount: filteredSignups.filter((s) => !s.deletedAt).length,
      };
    }),
  };
}

/** Get event details without signups (for users who can view but not edit). */
export async function getEventByIdForViewer(eventId: EventID) {
  const event = await db.query.events.findFirst({
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
      updatedAt: true,
    },
    where: { id: { eq: eventId } },
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
        with: { languages: true },
      },
    },
  });

  if (!event) throw new Error("No event found with id");

  const langFields = reconstructEventLanguages(event, event.languages, event.quotas, event.questions, true);

  return {
    ...event,
    ...langFields,
    quotas: event.quotas.map((quota) => ({
      ...quota,
      signups: [],
      signupCount: 0,
    })),
  };
}

import {
  ManualPaymentStatus,
  PaymentStatus,
  type ProductSchema,
  QuestionID,
  QuotaID,
  type SignupID,
  SignupStatus,
} from "@/db/schema";
import type { ConfirmationMailData, PaymentMailData, PromotedMailData } from "@/db/zod";

import { env } from "@/env";
import { getEffectivePaymentStatus } from "../db/computed";
import { getQuestionForLanguage, getTitleForLanguage } from "../db/helpers";
import { t } from "../i18n/server";
import { formatDateInTimezone } from "./formatDate";
import { generateToken } from "../services/signups/editTokens";
import EmailService, { ConfirmationMailParams, PaymentMailParams, PromotedFromQueueMailParams } from ".";

function sendSynchronouslyInTest<A extends any[]>(func: (...args: A) => Promise<void>): (...args: A) => Promise<void> {
  if (env.NODE_ENV === "test" || env.NODE_ENV === "bench") return func;
  return async (...args: A) => {
    func(...args).catch((err) => {
      console.error("Error sending email:", err);
    });
  };
}

/** Resolves localized event fields for a given language, falling back to the main table defaults. */
function localizedEventFields(
  event: { title: string; location: string | null; verificationEmail?: string | null },
  langRow: { title: string; location: string | null; verificationEmail?: string | null } | undefined,
) {
  return {
    title: langRow?.title ?? event.title,
    location: langRow?.location ?? event.location ?? null,
    verificationEmail: langRow?.verificationEmail ?? event.verificationEmail ?? null,
  };
}

/** Generates an edit/cancel link for a signup. */
function signupEditLink(signupId: SignupID) {
  const editToken = generateToken(signupId);
  return `${env.BASE_URL}/signup/${signupId}/${editToken}`;
}

interface MailSignup {
  id: SignupID;
  email: string | null;
  firstName?: string | null;
  lastName?: string | null;
  language: string | null;
  status: SignupStatus | null;
  position: number | null;
  quotaId: QuotaID;
  price?: number | null;
  manualPaymentStatus?: ManualPaymentStatus | null;
}

/** Sends a "promoted from queue" email using pre-fetched event data and signup payments. */
export const sendPromotedFromQueueMail = sendSynchronouslyInTest(
  async (signup: MailSignup & { payments: { status: PaymentStatus }[] }, event: PromotedMailData["event"]) => {
    if (!signup.email) return;
    if (event.deletedAt) return;
    const lang = signup.language ?? env.NEXT_PUBLIC_DEFAULT_LANGUAGE;

    const date =
      event.date &&
      formatDateInTimezone(event.date, env.NEXT_PUBLIC_APP_TIMEZONE, t("currencyFormat.locale", { lng: lang }));

    const params: PromotedFromQueueMailParams = {
      event: {
        ...event,
        ...localizedEventFields(
          event,
          event.languages.find((r) => r.language === lang),
        ),
      },
      date,
      paymentStatus: getEffectivePaymentStatus(signup, signup.payments),
      cancelLink: signupEditLink(signup.id),
    };

    await EmailService.sendPromotedFromQueueMail(signup.email, signup.language, params);
  },
);

interface ConfirmationSignup extends MailSignup {
  answers: { questionId: QuestionID; answer: string | string[] }[];
  payments: { status: PaymentStatus }[];
}

/** Sends a signup confirmation email using pre-fetched event/quota data. */
export const sendSignupConfirmationMail = sendSynchronouslyInTest(
  async (
    signup: ConfirmationSignup,
    type: ConfirmationMailParams["type"],
    admin: boolean,
    data: ConfirmationMailData,
  ) => {
    if (!signup.email) return;
    const lang = signup.language ?? env.NEXT_PUBLIC_DEFAULT_LANGUAGE;

    const { quota: quotaData, event } = data;
    if (event.deletedAt) return;

    const fullName = `${signup.firstName ?? ""} ${signup.lastName ?? ""}`.trim();

    const questionFields = event.questions
      .map((question) => {
        const answer = signup.answers.find((a) => a.questionId === question.id);
        if (!answer) return null;
        const localized = getQuestionForLanguage(question.question, question.options, question.languages, lang);
        return {
          label: localized.question,
          answer: Array.isArray(answer.answer) ? answer.answer.join(", ") : String(answer.answer),
        };
      })
      .filter((x): x is { label: string; answer: string } => x !== null);

    const date =
      event.date &&
      formatDateInTimezone(event.date, env.NEXT_PUBLIC_APP_TIMEZONE, t("currencyFormat.locale", { lng: lang }));

    const params: ConfirmationMailParams = {
      name: fullName,
      email: signup.email,
      quota: getTitleForLanguage(quotaData.title, quotaData.languages, lang),
      answers: questionFields,
      queuePosition: signup.status === SignupStatus.IN_QUEUE ? signup.position : null,
      paymentStatus: getEffectivePaymentStatus(signup, signup.payments),
      type,
      admin,
      date,
      event: {
        ...event,
        ...localizedEventFields(
          event,
          event.languages.find((r) => r.language === lang),
        ),
      },
      cancelLink: signupEditLink(signup.id),
    };

    await EmailService.sendConfirmationMail(signup.email, signup.language, params);
  },
);

/** Sends a payment confirmation email using pre-fetched signup/event data. */
export const sendPaymentConfirmationMail = sendSynchronouslyInTest(
  async (
    payment: {
      amount: number;
      currency: string;
      products: ProductSchema[];
    },
    signup: { id: SignupID; email: string | null; language: string | null },
    event: PaymentMailData["event"],
  ) => {
    if (!signup.email) return;
    if (event.deletedAt) return;

    const lang = signup.language ?? env.NEXT_PUBLIC_DEFAULT_LANGUAGE;

    const priceFormatter = new Intl.NumberFormat(t("currencyFormat.locale", { lng: lang }), {
      style: "currency",
      currency: payment.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const params: PaymentMailParams = {
      event: {
        ...event,
        ...localizedEventFields(
          event,
          event.languages.find((r) => r.language === lang),
        ),
      },
      totalFormatted: priceFormatter.format(payment.amount / 100),
      currency: payment.currency,
      products: payment.products.map((product) => ({
        name: product.name,
        amount: product.amount,
        unitPriceFormatted: priceFormatter.format(product.unitPrice / 100),
      })),
      cancelLink: signupEditLink(signup.id),
    };

    await EmailService.sendPaymentConfirmationMail(signup.email, signup.language, params);
  },
);

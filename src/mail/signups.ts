import { type SignupID, SignupStatus } from "@/models";

import { env } from "@/env";
import { db } from "../db";
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
      // eslint-disable-next-line no-console
      console.error("Error sending email:", err);
    });
  };
}

interface MailSignup {
  id: string;
  email: string | null;
  firstName?: string | null;
  lastName?: string | null;
  language: string | null;
  status: string | null;
  position: number | null;
  quotaId: string;
  price?: number | null;
  manualPaymentStatus?: string | null;
}

/** Fetches information for a "promoted from queue" email and sends it. */
export const sendPromotedFromQueueMail = sendSynchronouslyInTest(async (signup: MailSignup) => {
  if (!signup.email) return;
  const lang = signup.language ?? env.DEFAULT_LANGUAGE;

  const signupPayments = await db.query.payments.findMany({
    where: { signupId: signup.id },
    columns: { status: true },
  });

  const quotaData = await db.query.quotas.findFirst({
    where: { id: signup.quotaId },
    with: {
      event: {
        with: { languages: true },
      },
    },
  });
  if (!quotaData?.event) return;
  const event = quotaData.event;
  if (event.deletedAt) return;

  // Language fallback: requested → default (from main table)
  const eventLang = event.languages.find((r) => r.language === lang);

  const date =
    event.date && formatDateInTimezone(event.date, env.APP_TIMEZONE, t("currencyFormat.locale", { lng: lang }));
  const editToken = generateToken(signup.id as SignupID);
  const cancelLink = `${env.BASE_URL}/signup/${signup.id}/${editToken}`;

  const params: PromotedFromQueueMailParams = {
    event: {
      ...event,
      title: eventLang?.title ?? event.title,
      description: eventLang?.description ?? event.description ?? null,
      location: eventLang?.location ?? event.location ?? null,
    },
    date,
    paymentStatus: getEffectivePaymentStatus(signup, signupPayments),
    cancelLink,
  };

  await EmailService.sendPromotedFromQueueMail(signup.email, signup.language, params);
});

interface ConfirmationSignup extends MailSignup {
  answers?: unknown[];
  payments?: { status: string }[];
}

/** Fetches information for a signup confirmation email and sends it. */
export const sendSignupConfirmationMail = sendSynchronouslyInTest(
  async (signup: ConfirmationSignup, type: ConfirmationMailParams["type"], admin: boolean) => {
    if (!signup.email) return;
    const lang = signup.language ?? env.DEFAULT_LANGUAGE;

    const signupPayments =
      signup.payments ??
      (await db.query.payments.findMany({
        where: { signupId: signup.id },
        columns: { status: true },
      }));

    const signupAnswers = await db.query.answers.findMany({
      where: { signupId: signup.id },
    });

    const quotaData = await db.query.quotas.findFirst({
      where: { id: signup.quotaId },
      with: {
        languages: true,
        event: {
          with: {
            languages: true,
            questions: {
              where: { deletedAt: { isNull: true } },
              orderBy: { order: "asc" },
              with: { languages: true },
            },
          },
        },
      },
    });
    if (!quotaData?.event) return;
    const event = quotaData.event;
    if (event.deletedAt) return;

    // Language fallback: requested → default (from main table)
    const eventLang = event.languages.find((r) => r.language === lang);

    const fullName = `${signup.firstName ?? ""} ${signup.lastName ?? ""}`.trim();

    const questionFields = event.questions
      .map((question) => {
        const answer = signupAnswers.find((a) => a.questionId === question.id);
        if (!answer) return null;
        const localized = getQuestionForLanguage(question.question, question.options, question.languages, lang);
        return {
          label: localized.question,
          answer: Array.isArray(answer.answer) ? answer.answer.join(", ") : String(answer.answer),
        };
      })
      .filter((x): x is { label: string; answer: string } => x !== null);

    const quotaTitle = getTitleForLanguage(quotaData.title, quotaData.languages, lang);

    const date =
      event.date && formatDateInTimezone(event.date, env.APP_TIMEZONE, t("currencyFormat.locale", { lng: lang }));
    const editToken = generateToken(signup.id as SignupID);
    const cancelLink = `${env.BASE_URL}/signup/${signup.id}/${editToken}`;

    const params: ConfirmationMailParams = {
      name: fullName,
      email: signup.email,
      quota: quotaTitle,
      answers: questionFields,
      queuePosition: signup.status === SignupStatus.IN_QUEUE ? signup.position : null,
      paymentStatus: getEffectivePaymentStatus(signup, signupPayments),
      type,
      admin,
      date,
      event: {
        ...event,
        title: eventLang?.title ?? event.title,
        description: eventLang?.description ?? event.description ?? null,
        location: eventLang?.location ?? event.location ?? null,
        verificationEmail: eventLang?.verificationEmail ?? event.verificationEmail ?? null,
      },
      cancelLink,
    };

    await EmailService.sendConfirmationMail(signup.email, signup.language, params);
  },
);

/** Fetches information for a payment confirmation email and sends it. */
export const sendPaymentConfirmationMail = sendSynchronouslyInTest(
  async (payment: { id: number; signupId: string; amount: number; currency: string; products: unknown[] }) => {
    const signupRow = await db.query.signups.findFirst({
      where: { id: payment.signupId },
    });
    if (!signupRow?.email) return;

    const lang = signupRow.language ?? env.DEFAULT_LANGUAGE;

    const quotaData = await db.query.quotas.findFirst({
      where: { id: signupRow.quotaId },
      with: {
        event: {
          with: { languages: true },
        },
      },
    });
    if (!quotaData?.event) return;
    const event = quotaData.event;
    if (event.deletedAt) return;

    // Language fallback: requested → default (from main table)
    const eventLang = event.languages.find((r) => r.language === lang);

    const editToken = generateToken(signupRow.id as SignupID);
    const cancelLink = `${env.BASE_URL}/signup/${signupRow.id}/${editToken}`;

    const priceFormatter = new Intl.NumberFormat(t("currencyFormat.locale", { lng: lang }), {
      style: "currency",
      currency: payment.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const typedProducts = payment.products as Array<{ name: string; unitPrice: number; amount: number }>;
    const params: PaymentMailParams = {
      event: {
        ...event,
        title: eventLang?.title ?? event.title,
        description: eventLang?.description ?? event.description ?? null,
        location: eventLang?.location ?? event.location ?? null,
      },
      totalFormatted: priceFormatter.format(payment.amount / 100),
      currency: payment.currency,
      products: typedProducts.map((product) => ({
        name: product.name,
        amount: product.amount,
        unitPriceFormatted: priceFormatter.format(product.unitPrice / 100),
      })),
      cancelLink,
    };

    await EmailService.sendPaymentConfirmationMail(signupRow.email, signupRow.language, params);
  },
);

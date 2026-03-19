/* eslint-disable no-console */
import { env } from "@/env";

import { t } from "../i18n/server";
import mailTransporter from "./config";
import {
  type ConfirmationMailParams,
  type NewUserMailParams,
  type PaymentMailParams,
  type PromotedFromQueueMailParams,
  renderMailTemplate,
} from "./templates";

export type {
  ConfirmationMailParams,
  MailEventData,
  NewUserMailParams,
  PaymentMailParams,
  PromotedFromQueueMailParams,
} from "./templates";

/** Shared branding and language config for all email templates. */
function renderTemplate<T extends "confirmation" | "payment" | "newUser" | "queueMail">(
  template: T,
  language: string | null,
  data: Parameters<typeof renderMailTemplate<T>>[0]["data"],
) {
  return renderMailTemplate({
    template,
    language,
    defaultLanguage: env.NEXT_PUBLIC_DEFAULT_LANGUAGE,
    branding: {
      footerText: env.BRANDING_MAIL_FOOTER_TEXT,
      footerLink: env.BRANDING_MAIL_FOOTER_LINK,
    },
    data,
  });
}

export default class EmailService {
  static send(to: string, subject: string, html: string) {
    return mailTransporter.sendMail({
      to,
      from: env.MAIL_FROM,
      subject,
      html,
    });
  }

  static async sendConfirmationMail(to: string, language: string | null, params: ConfirmationMailParams) {
    try {
      const { html, lng } = await renderTemplate("confirmation", language, params);
      const subjectKey =
        params.type === "signup" ? "emails.confirmationSignupSubject" : "emails.confirmationEditSubject";
      await EmailService.send(to, t(subjectKey, { lng, event: params.event.title }), html);
    } catch (error) {
      console.error(error);
    }
  }

  static async sendPaymentConfirmationMail(to: string, language: string | null, params: PaymentMailParams) {
    try {
      const { html, lng } = await renderTemplate("payment", language, params);
      await EmailService.send(to, t("emails.paymentSubject", { lng, event: params.event.title }), html);
    } catch (error) {
      console.error(error);
    }
  }

  static async sendNewUserMail(to: string, language: string | null, params: NewUserMailParams) {
    try {
      const { html, lng } = await renderTemplate("newUser", language, params);
      await EmailService.send(to, t("emails.newUserSubject", { lng }), html);
    } catch (error) {
      console.error(error);
    }
  }

  static async sendPromotedFromQueueMail(to: string, language: string | null, params: PromotedFromQueueMailParams) {
    try {
      const { html, lng } = await renderTemplate("queueMail", language, params);
      await EmailService.send(to, t("emails.promotedFromQueueSubject", { lng, event: params.event.title }), html);
    } catch (error) {
      console.error(error);
    }
  }
}

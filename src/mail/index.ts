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

export default class EmailService {
  static send(to: string, subject: string, html: string) {
    const msg = {
      to,
      from: env.MAIL_FROM,
      subject,
      html,
    };

    return mailTransporter.sendMail(msg);
  }

  static async sendConfirmationMail(to: string, language: string | null, params: ConfirmationMailParams) {
    try {
      const { html, lng } = await renderMailTemplate({
        template: "confirmation",
        language,
        defaultLanguage: env.NEXT_PUBLIC_DEFAULT_LANGUAGE,
        branding: {
          footerText: env.BRANDING_MAIL_FOOTER_TEXT,
          footerLink: env.BRANDING_MAIL_FOOTER_LINK,
        },
        data: params,
      });
      const subjectKey =
        params.type === "signup" ? "emails.confirmationSignupSubject" : "emails.confirmationEditSubject";
      const subject = t(subjectKey, {
        lng,
        event: params.event.title,
      });
      await EmailService.send(to, subject, html);
    } catch (error) {
      console.error(error);
    }
  }

  static async sendPaymentConfirmationMail(to: string, language: string | null, params: PaymentMailParams) {
    try {
      const { html, lng } = await renderMailTemplate({
        template: "payment",
        language,
        defaultLanguage: env.NEXT_PUBLIC_DEFAULT_LANGUAGE,
        branding: {
          footerText: env.BRANDING_MAIL_FOOTER_TEXT,
          footerLink: env.BRANDING_MAIL_FOOTER_LINK,
        },
        data: params,
      });
      const subject = t("emails.paymentSubject", { lng, event: params.event.title });
      await EmailService.send(to, subject, html);
    } catch (error) {
      console.error(error);
    }
  }

  static async sendNewUserMail(to: string, language: string | null, params: NewUserMailParams) {
    try {
      const { html, lng } = await renderMailTemplate({
        template: "newUser",
        language,
        defaultLanguage: env.NEXT_PUBLIC_DEFAULT_LANGUAGE,
        branding: {
          footerText: env.BRANDING_MAIL_FOOTER_TEXT,
          footerLink: env.BRANDING_MAIL_FOOTER_LINK,
        },
        data: {
          ...params,
          siteUrl: `${env.BASE_URL}/admin`,
        },
      });
      const subject = t("emails.newUserSubject", { lng });
      await EmailService.send(to, subject, html);
    } catch (error) {
      console.error(error);
    }
  }

  static async sendResetPasswordMail(to: string, language: string | null, params: NewUserMailParams) {
    try {
      const { html, lng } = await renderMailTemplate({
        template: "resetPassword",
        language,
        defaultLanguage: env.NEXT_PUBLIC_DEFAULT_LANGUAGE,
        branding: {
          footerText: env.BRANDING_MAIL_FOOTER_TEXT,
          footerLink: env.BRANDING_MAIL_FOOTER_LINK,
        },
        data: {
          ...params,
          siteUrl: `${env.BASE_URL}/admin`,
        },
      });
      const subject = t("emails.resetPasswordSubject", { lng });
      await EmailService.send(to, subject, html);
    } catch (error) {
      console.error(error);
    }
  }

  static async sendPromotedFromQueueMail(to: string, language: string | null, params: PromotedFromQueueMailParams) {
    try {
      const { html, lng } = await renderMailTemplate({
        template: "queueMail",
        language,
        defaultLanguage: env.NEXT_PUBLIC_DEFAULT_LANGUAGE,
        branding: {
          footerText: env.BRANDING_MAIL_FOOTER_TEXT,
          footerLink: env.BRANDING_MAIL_FOOTER_LINK,
        },
        data: params,
      });
      const subject = t("emails.promotedFromQueueSubject", {
        lng,
        event: params.event.title,
      });
      await EmailService.send(to, subject, html);
    } catch (error) {
      console.error(error);
    }
  }
}

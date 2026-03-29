import { createEvent } from "ics";
import type Mail from "nodemailer/lib/mailer";

import { env } from "@/env";
import { createIcalEventAttrs } from "@/util/ical";
import { getTranslations } from "next-intl/server";

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
  static send(to: string, subject: string, html: string, icalEvent?: Mail.IcalAttachment) {
    return mailTransporter.sendMail({
      to,
      from: env.MAIL_FROM,
      subject,
      html,
      icalEvent,
    });
  }

  static async sendConfirmationMail(to: string, language: string | null, params: ConfirmationMailParams) {
    try {
      const { html, lng } = await renderTemplate("confirmation", language, params);
      const t = await getTranslations({ locale: lng, namespace: "emails" });
      const subject =
        params.type === "signup"
          ? t("confirmationSignupSubject", { event: params.event.title })
          : t("confirmationEditSubject", { event: params.event.title });

      let icalEvent: Mail.IcalAttachment | undefined;
      const event = params.event;
      const icalAttrs = createIcalEventAttrs({
        id: event.id as string,
        title: event.title,
        description: (event.description as string | null) ?? null,
        location: (event.location as string | null) ?? null,
        category: (event.category as string | null) ?? null,
        slug: event.slug as string,
        date: (event.date as Date | null) ?? null,
        endDate: (event.endDate as Date | null) ?? null,
      });
      if (icalAttrs) {
        const { value, error: icalError } = createEvent(icalAttrs);
        if (icalError || !value) {
          console.error("Failed to create iCal event:", icalError);
        } else {
          icalEvent = {
            content: value,
            method: "PUBLISH",
            filename: "invite.ics",
          };
        }
      }

      await EmailService.send(to, subject, html, icalEvent);
    } catch (error) {
      console.error(error);
    }
  }

  static async sendPaymentConfirmationMail(to: string, language: string | null, params: PaymentMailParams) {
    try {
      const { html, lng } = await renderTemplate("payment", language, params);
      const t = await getTranslations({ locale: lng, namespace: "emails" });
      await EmailService.send(to, t("paymentSubject", { event: params.event.title }), html);
    } catch (error) {
      console.error(error);
    }
  }

  static async sendNewUserMail(to: string, language: string | null, params: NewUserMailParams) {
    try {
      const { html, lng } = await renderTemplate("newUser", language, params);
      const t = await getTranslations({ locale: lng, namespace: "emails" });
      await EmailService.send(to, t("newUserSubject"), html);
    } catch (error) {
      console.error(error);
    }
  }

  static async sendPromotedFromQueueMail(to: string, language: string | null, params: PromotedFromQueueMailParams) {
    try {
      const { html, lng } = await renderTemplate("queueMail", language, params);
      const t = await getTranslations({ locale: lng, namespace: "emails" });
      await EmailService.send(to, t("promotedFromQueueSubject", { event: params.event.title }), html);
    } catch (error) {
      console.error(error);
    }
  }
}

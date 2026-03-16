import * as rootParams from "next/root-params";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import en from "./en";
import fi from "./fi";
import sv from "./sv";

import { routing } from "./routing";

const messages = { fi, en, sv } as const;

export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    const paramValue = await rootParams.locale();
    locale = hasLocale(routing.locales, paramValue) ? paramValue : routing.defaultLocale;
  }

  return {
    locale,
    messages: messages[locale as keyof typeof messages] ?? fi,
  };
});

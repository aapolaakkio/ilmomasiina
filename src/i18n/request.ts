import * as rootParams from "next/root-params";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import en from "./en";
import fi from "./fi";
import sv from "./sv";

import { routing } from "./routing";
import { notFound } from "next/navigation";

const messages = { fi, en, sv } as const;

export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    const paramValue = await rootParams.locale();
    if (hasLocale(routing.locales, paramValue)) {
      locale = paramValue;
    } else {
      notFound();
    }
  }

  return {
    locale,
    messages: messages[locale as keyof typeof messages] ?? fi,
  };
});

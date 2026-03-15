import * as rootParams from "next/root-params";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import en from "./en";
import fi from "./fi";

import { routing } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    const paramValue = await rootParams.locale();
    locale = hasLocale(routing.locales, paramValue) ? paramValue : routing.defaultLocale;
  }

  return {
    locale,
    messages: locale === "fi" ? fi : en,
  };
});

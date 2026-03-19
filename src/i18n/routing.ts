import { defineRouting } from "next-intl/routing";

import { env } from "@/env";

export const KNOWN_LANGUAGES = ["fi", "sv", "en"] as const;
export type KnownLanguage = (typeof KNOWN_LANGUAGES)[number];

export const routing = defineRouting({
  locales: KNOWN_LANGUAGES,
  defaultLocale: env.NEXT_PUBLIC_DEFAULT_LANGUAGE as KnownLanguage,
  localePrefix: "always",
});

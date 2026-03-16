import { defineRouting } from "next-intl/routing";

import { env } from "@/env";

export const routing = defineRouting({
  locales: ["fi", "en", "sv"],
  defaultLocale: env.NEXT_PUBLIC_DEFAULT_LANGUAGE as "fi" | "en" | "sv",
  localePrefix: "always",
});

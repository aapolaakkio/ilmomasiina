import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { locale as rootLocale } from "next/root-params";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import "../globals.css";
import { env } from "@/env";
import { routing } from "@/i18n/routing";

const font = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap" });

export const generateStaticParams = () => routing.locales.map((locale) => ({ locale }));

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  const siteName = env.NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT;
  return {
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description: t("description"),
  };
}

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await rootLocale();
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  return (
    <html lang={locale} className={font.className}>
      <body className="bg-gray-50 leading-relaxed text-gray-900 antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}

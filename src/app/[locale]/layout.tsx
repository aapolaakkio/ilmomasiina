import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { locale as rootLocale } from "next/root-params";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";

import "../globals.css";
import { routing } from "@/i18n/routing";

const openSans = Open_Sans({ subsets: ["latin"], display: "swap" });

export const generateStaticParams = () => routing.locales.map((locale) => ({ locale }));
export const metadata: Metadata = {
  title: "Ilmomasiina",
  description: "Event signup system",
};

export default async function LocaleLayout({ children }: { children: React.ReactNode }) {
  const locale = await rootLocale();
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }
  const messages = await getMessages();

  return (
    <html lang={locale} className={openSans.className}>
      <body className="bg-gray-50 leading-relaxed text-gray-900 antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

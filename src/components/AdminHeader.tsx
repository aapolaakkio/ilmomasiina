"use client";

import { useTranslations } from "next-intl";

import { logoutAction } from "@/actions/logout";
import { env } from "@/env";
import { Link } from "@/i18n/navigation";

import LanguageChanger from "./LanguageChanger";

export default function AdminHeader() {
  const t = useTranslations("header");

  return (
    <header className="border-b-2 border-accent bg-surface text-white">
      <div className="mx-auto flex max-w-5xl items-baseline justify-between px-4 py-3">
        <Link href="/admin" className="font-extrabold uppercase tracking-widest text-accent no-underline">
          <span className="hidden text-lg sm:inline">{env.NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT}</span>
          <span className="text-base sm:hidden">{env.NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT_SHORT}</span>
          <span className="ml-2 text-xs font-normal normal-case tracking-normal text-gray-500">(admin)</span>
        </Link>
        <div className="flex items-baseline gap-5">
          <Link
            href="/"
            className="text-xs font-medium uppercase tracking-wider text-gray-300 no-underline transition-colors hover:text-accent"
          >
            {t("eventList")}
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-xs font-medium uppercase tracking-wider text-gray-300 transition-colors hover:text-accent"
            >
              {t("logout")}
            </button>
          </form>
          <LanguageChanger />
        </div>
      </div>
    </header>
  );
}

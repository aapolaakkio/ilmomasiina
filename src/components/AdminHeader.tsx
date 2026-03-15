"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { logoutAction } from "@/actions/logout";
import { env } from "@/env";
import { Link, useRouter } from "@/i18n/navigation";

export default function AdminHeader() {
  const t = useTranslations("header");
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    await logoutAction();
    router.push("/login");
  }, [router]);

  return (
    <header className="bg-gray-900 text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/admin" className="font-bold uppercase tracking-wide text-white no-underline">
          <span className="hidden text-lg sm:inline">{env.NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT}</span>
          <span className="text-base sm:hidden">{env.NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT_SHORT}</span>
          <span className="ml-2 text-xs font-normal normal-case tracking-normal text-gray-400">(admin)</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-300 no-underline hover:text-white">
            {t("eventList")}
          </Link>
          <button type="button" className="text-sm text-gray-300 hover:text-white" onClick={handleLogout}>
            {t("logout")}
          </button>
        </div>
      </div>
    </header>
  );
}

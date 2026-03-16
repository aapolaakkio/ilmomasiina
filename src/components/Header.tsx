"use client";

import { useLocale } from "next-intl";

import { env } from "@/env";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const localeLabels: Record<string, string> = {
  fi: "Suomi",
  en: "English",
  sv: "Svenska",
};

export default function Header() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="border-b-2 border-accent bg-surface text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-extrabold uppercase tracking-widest text-accent no-underline">
          <span className="hidden text-lg sm:inline">{env.NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT}</span>
          <span className="text-base sm:hidden">{env.NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT_SHORT}</span>
        </Link>
        <div className="flex items-center gap-5">
          <Link
            href="/admin"
            className="text-xs font-medium uppercase tracking-wider text-gray-300 no-underline transition-colors hover:text-accent"
          >
            Admin
          </Link>
          <select
            className="cursor-pointer rounded border border-gray-600 bg-transparent px-2 py-1 text-xs font-medium uppercase tracking-wider text-gray-300 transition-colors hover:text-accent focus:border-accent focus:outline-none"
            value={locale}
            onChange={(e) => router.replace(pathname, { locale: e.target.value })}
          >
            {routing.locales.map((loc) => (
              <option key={loc} value={loc} className="bg-surface text-white">
                {localeLabels[loc] ?? loc}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}

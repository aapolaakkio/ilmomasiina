"use client";

import { useLocale } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const localeLabels: Record<string, string> = {
  fi: "Suomi",
  en: "English",
  sv: "Svenska",
};

export default function LanguageChanger() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
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
  );
}

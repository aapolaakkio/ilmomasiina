"use client";

import { useLocale } from "next-intl";

import { env } from "@/env";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

export default function Header() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const otherLocale = locale === "fi" ? "en" : "fi";
  const switchLabel = locale === "fi" ? "In English" : "Suomeksi";

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
          <button
            type="button"
            className="text-xs font-medium uppercase tracking-wider text-gray-300 transition-colors hover:text-accent"
            onClick={() => router.replace(pathname, { locale: otherLocale })}
          >
            {switchLabel}
          </button>
        </div>
      </div>
    </header>
  );
}

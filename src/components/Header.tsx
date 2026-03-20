import { env } from "@/env";
import { Link } from "@/i18n/navigation";

import LanguageChanger from "./LanguageChanger";

export default function Header() {
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
          <LanguageChanger />
        </div>
      </div>
    </header>
  );
}

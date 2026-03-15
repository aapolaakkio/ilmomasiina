"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export default function ErrorPage() {
  const t = useTranslations("errors.default");
  const tCommon = useTranslations("common");

  return (
    <div className="py-16 text-center">
      <h1 className="mb-4 text-2xl">{t("title")}</h1>
      <p className="mb-4 text-gray-600">{t("description")}</p>
      <p className="mb-6 text-sm text-gray-500">{tCommon("contactAdmin")}</p>
      <Link href="/" className="text-brand-600 hover:underline">
        {tCommon("returnToEvents")}
      </Link>
    </div>
  );
}

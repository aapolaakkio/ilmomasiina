"use client";

import { useTranslations } from "next-intl";

import { signInAction } from "@/actions/signIn";
import { Button } from "@/components/ui/Button";

export default function SetupForm() {
  const t = useTranslations("initialSetup");

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1>
      <p className="mb-1 font-semibold">{t("welcome1")}</p>
      <p className="mb-6 text-gray-600">{t("welcome2")}</p>
      <form action={signInAction}>
        <Button type="submit" variant="secondary">
          {t("submit")}
        </Button>
      </form>
    </div>
  );
}

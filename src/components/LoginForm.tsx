"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { signInAction } from "@/actions/signIn";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

type Props = { initialSetup: boolean };

export default function LoginForm({ initialSetup }: Props) {
  const t = useTranslations("login");
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  if (initialSetup) {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="mb-4 text-2xl font-bold">{t("setupTitle")}</h1>
        <p className="mb-1 font-semibold">{t("setupWelcome1")}</p>
        <p className="mb-6 text-gray-600">{t("setupWelcome2")}</p>
        {error && (
          <Alert variant="danger" className="mb-4">
            {error === "AccessDenied" ? t("notAllowed") : t("failed")}
          </Alert>
        )}
        <form action={signInAction}>
          <Button type="submit" variant="secondary">
            {t("submit")}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-1 w-12 bg-accent" />
          <h1 className="text-2xl font-extrabold tracking-wider">{t("title")}</h1>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {error && (
            <Alert variant="danger" className="mb-4">
              {error === "AccessDenied" ? t("notAllowed") : t("failed")}
            </Alert>
          )}
          <form action={signInAction}>
            <Button type="submit" className="w-full">
              {t("submit")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

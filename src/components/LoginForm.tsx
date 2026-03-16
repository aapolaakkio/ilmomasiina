"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { signInAction } from "@/actions/signIn";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export default function LoginForm() {
  const t = useTranslations("login");
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

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

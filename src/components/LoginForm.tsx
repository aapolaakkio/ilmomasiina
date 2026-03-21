"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { signInAction, signInWithCredentialsAction } from "@/actions/signIn";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

type Props = { initialSetup: boolean; testCredentialsEnabled?: boolean };

export default function LoginForm({ initialSetup, testCredentialsEnabled }: Props) {
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
          {testCredentialsEnabled && (
            <form action={signInWithCredentialsAction} className="mt-4 border-t border-gray-200 pt-4">
              <label htmlFor="test-credentials-email" className="mb-1 block text-sm font-medium text-gray-700">
                Test login
              </label>
              <input
                id="test-credentials-email"
                name="email"
                type="email"
                required
                placeholder="admin@test.com"
                className="mb-2 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
              <Button type="submit" variant="secondary" className="w-full">
                Sign in with test credentials
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

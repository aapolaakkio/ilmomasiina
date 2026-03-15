"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";

import { loginAction } from "@/actions/login";
import { env } from "@/env";
import { useRouter } from "@/i18n/navigation";
import { useFormValidation } from "@/lib/useFormValidation";
import { adminLoginBody } from "@/models/schema/login";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { FieldError } from "@/components/ui/FieldError";

export default function LoginForm() {
  const t = useTranslations("login");
  const tErrors = useTranslations("editor.errors");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { fieldErrors, validate, clearError } = useFormValidation();

  const { execute, isPending } = useAction(loginAction, {
    onSuccess: () => {
      router.push("/admin");
    },
    onError: ({ error: err }) => {
      setError(err.serverError ?? t("failed"));
    },
  });

  const handleSubmit = useCallback(
    (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isPending) return;
      setError(null);

      const valid = validate(adminLoginBody, { email, password }, (field) => {
        if (field === "email") return tErrors("required");
        if (field === "password") return tErrors("required");
        return undefined;
      });
      if (!valid) return;

      execute({ email, password });
    },
    [email, password, isPending, validate, tErrors, execute],
  );

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <form onSubmit={handleSubmit}>
        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}
        <Field.Root>
          <Field.Label htmlFor="login-email">{t("email")}</Field.Label>
          <input
            id="login-email"
            type="email"
            className={inputClassName}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError("email");
            }}
            placeholder={env.NEXT_PUBLIC_BRANDING_LOGIN_PLACEHOLDER_EMAIL}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <FieldError error={fieldErrors.email} />
        </Field.Root>
        <Field.Root>
          <Field.Label htmlFor="login-password">{t("password")}</Field.Label>
          <input
            id="login-password"
            type="password"
            className={inputClassName}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearError("password");
            }}
            placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
          />
          <FieldError error={fieldErrors.password} />
        </Field.Root>
        <Button type="submit" variant="secondary" disabled={isPending} loading={isPending}>
          {t("submit")}
        </Button>
      </form>
    </div>
  );
}

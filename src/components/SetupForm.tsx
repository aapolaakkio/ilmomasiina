"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { z } from "zod/v4";

import { createInitialUserAction } from "@/actions/createInitialUser";
import { useRouter } from "@/i18n/navigation";
import { useFormValidation } from "@/lib/useFormValidation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { FieldError } from "@/components/ui/FieldError";

const MIN_PASSWORD_LENGTH = 10;

export default function SetupForm() {
  const t = useTranslations("initialSetup");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVerify, setPasswordVerify] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { fieldErrors, validate, clearError } = useFormValidation();

  const schema = useMemo(
    () =>
      z
        .object({
          email: z.email().min(1).max(255),
          password: z.string().min(MIN_PASSWORD_LENGTH).max(255),
          passwordVerify: z.string().min(1),
        })
        .refine((data) => data.password === data.passwordVerify, {
          path: ["passwordVerify"],
          message: "verifyMatch",
        }),
    [],
  );

  const { execute, isPending } = useAction(createInitialUserAction, {
    onSuccess: () => {
      router.push("/admin");
    },
    onError: ({ error: err }) => {
      setError(err.serverError ?? t("errors.failed"));
    },
  });

  const handleSubmit = useCallback(
    (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isPending) return;
      setError(null);

      const valid = validate(schema, { email, password, passwordVerify }, (field, msg) => {
        if (msg === "verifyMatch") return t("errors.verifyMatch");
        if (field === "email") return t("errors.required");
        if (field === "password") {
          if (/too small|at least/i.test(msg)) return t("errors.minLength", { number: MIN_PASSWORD_LENGTH });
          return t("errors.required");
        }
        if (field === "passwordVerify") return t("errors.required");
        return undefined;
      });
      if (!valid) return;

      execute({ email, password });
    },
    [email, password, passwordVerify, isPending, validate, schema, execute, t],
  );

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1>
      <p className="mb-1 font-semibold">{t("welcome1")}</p>
      <p className="mb-6 text-gray-600">{t("welcome2")}</p>
      <form onSubmit={handleSubmit}>
        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}
        <Field.Root>
          <Field.Label htmlFor="setup-email">{t("email")}</Field.Label>
          <input
            id="setup-email"
            type="email"
            className={inputClassName}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError("email");
            }}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <FieldError error={fieldErrors.email} />
        </Field.Root>
        <Field.Root>
          <Field.Label htmlFor="setup-password">{t("password")}</Field.Label>
          <input
            id="setup-password"
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
        <Field.Root>
          <Field.Label htmlFor="setup-password-verify">{t("passwordVerify")}</Field.Label>
          <input
            id="setup-password-verify"
            type="password"
            className={inputClassName}
            value={passwordVerify}
            onChange={(e) => {
              setPasswordVerify(e.target.value);
              clearError("passwordVerify");
            }}
            placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
          />
          <FieldError error={fieldErrors.passwordVerify} />
        </Field.Root>
        <Button type="submit" variant="secondary" disabled={isPending} loading={isPending}>
          {t("submit")}
        </Button>
      </form>
    </div>
  );
}

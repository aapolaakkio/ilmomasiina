"use client";

import { useState } from "react";

import type { z } from "zod";

type FieldErrors = Record<string, string>;

type ErrorMapper = (field: string, message: string) => string | undefined;

/** Convert a Zod issue path to a dot-bracket key like "quotas[0].title" */
function pathToKey(path: (string | number)[]): string {
  return path.reduce<string>((acc, seg) => {
    if (typeof seg === "number") return `${acc}[${seg}]`;
    return acc ? `${acc}.${seg}` : seg;
  }, "");
}

/**
 * Generic form validation hook using Zod schemas.
 * Manages per-field error state; does not manage form values.
 */
export function useFormValidation() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const validate = <T extends z.ZodType>(schema: T, data: unknown, errorMap?: ErrorMapper): boolean => {
    const result = schema.safeParse(data);
    if (result.success) {
      setFieldErrors({});
      return true;
    }

    const errors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const key = pathToKey(issue.path.filter((seg): seg is string | number => typeof seg !== "symbol"));
      if (!key || key in errors) continue;
      const mapped = errorMap?.(key, issue.message);
      errors[key] = mapped ?? issue.message;
    }

    setFieldErrors(errors);
    return false;
  };

  const clearErrors = () => {
    setFieldErrors({});
  };

  const clearError = (field: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  return { fieldErrors, validate, clearErrors, clearError };
}

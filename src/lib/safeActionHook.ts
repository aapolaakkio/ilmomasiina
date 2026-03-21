import type { HookActionStatus } from "next-safe-action/hooks";

type ResultSlice = {
  serverError?: unknown;
  validationErrors?: unknown;
};

export function isHookActionPending(status: HookActionStatus) {
  return status === "executing" || status === "transitioning";
}

function errorText(result: ResultSlice | undefined, fallback: string, validationFallback: string) {
  const se = result?.serverError;
  if (se != null && String(se) !== "") return String(se);
  if (result?.validationErrors) return validationFallback;
  return fallback;
}

/** First `hasErrored` in list wins (use one entry for a single hook). */
export function firstAmongHookErrors(
  entries: Array<{
    status: HookActionStatus;
    result: ResultSlice | undefined;
    fallback: string;
    validationFallback?: string;
  }>,
) {
  for (const e of entries) {
    if (e.status !== "hasErrored") continue;
    return errorText(e.result, e.fallback, e.validationFallback ?? e.fallback);
  }
  return null;
}

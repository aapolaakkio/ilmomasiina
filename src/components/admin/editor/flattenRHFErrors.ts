import type { FieldErrors } from "react-hook-form";

/**
 * Flatten RHF's nested FieldErrors into a Record<string, string> keyed
 * by paths like "title", "quotas[0].title", "dateInverted".
 * Applies an optional message mapper (e.g. for translation).
 */
export function flattenRHFErrors(errors: FieldErrors, mapMessage?: (msg: string) => string) {
  const flat: Record<string, string> = {};

  function walk(obj: unknown, prefix: string) {
    if (!obj || typeof obj !== "object") return;
    const rec = obj as Record<string, unknown>;

    if ("message" in rec && typeof rec.message === "string") {
      flat[prefix] = mapMessage ? mapMessage(rec.message) : rec.message;
      return;
    }

    for (const key of Object.keys(rec)) {
      if (key === "ref" || key === "type" || key === "root") continue;
      const child = rec[key];
      if (!child || typeof child !== "object") continue;
      const path = prefix ? (/^\d+$/.test(key) ? `${prefix}[${key}]` : `${prefix}.${key}`) : key;
      walk(child, path);
    }
  }

  walk(errors, "");
  return flat;
}

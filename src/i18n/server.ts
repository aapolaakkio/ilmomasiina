import en from "../i18n/en";
import fi from "../i18n/fi";
import sv from "../i18n/sv";

const resources = {
  en,
  fi,
  sv,
} as const;

export type KnownLanguage = keyof typeof resources;
export const knownLanguages = Object.keys(resources) as KnownLanguage[];

/** Navigate a nested object by a dot-separated key path. */
function getNestedValue(obj: Record<string, unknown>, keyPath: string): string | undefined {
  let current: unknown = obj;
  for (const part of keyPath.split(".")) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

/** Simple translation function replacing i18next. */
export function t(key: string, options?: { lng?: string; [key: string]: string | number | undefined }): string {
  const lng = (options?.lng ?? "fi") as KnownLanguage;
  const translations = resources[lng] ?? resources.fi;
  let value = getNestedValue(translations as unknown as Record<string, unknown>, key) ?? key;
  if (options) {
    for (const [k, v] of Object.entries(options)) {
      if (k !== "lng" && v !== undefined) {
        value = value.replaceAll(`{${k}}`, String(v));
      }
    }
  }
  return value;
}

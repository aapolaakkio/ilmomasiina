import { env } from "@/env";

function withAppTimeZone(options: Omit<Intl.DateTimeFormatOptions, "timeZone">) {
  return { ...options, timeZone: env.NEXT_PUBLIC_APP_TIMEZONE };
}

/** Named presets for dates shown in the app UI (always {@link env.NEXT_PUBLIC_APP_TIMEZONE}). */
type AppDateTimeStyle = "date" | "dateTime" | "dateTimeWeekday" | "dateTimeSeconds";

const STYLE_OPTIONS: Record<AppDateTimeStyle, Intl.DateTimeFormatOptions> = {
  date: withAppTimeZone({
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour12: false,
  }),
  dateTime: withAppTimeZone({
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }),
  dateTimeWeekday: withAppTimeZone({
    weekday: "short",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }),
  dateTimeSeconds: withAppTimeZone({
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }),
};

/** Format a single instant using a BCP 47 locale (e.g. from {@link appLocaleToBcp47}). */
export function formatAppDateTime(date: Date, bcp47Locale: string, style: AppDateTimeStyle) {
  return new Intl.DateTimeFormat(bcp47Locale, STYLE_OPTIONS[style]).format(date);
}

/** Reuse for tight loops (e.g. long tables). */
export function createAppDateTimeFormatter(bcp47Locale: string, style: AppDateTimeStyle) {
  return new Intl.DateTimeFormat(bcp47Locale, STYLE_OPTIONS[style]);
}

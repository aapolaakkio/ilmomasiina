import { createEnv } from "@t3-oss/env-nextjs";
import Stripe from "stripe";
import { z, ZodType } from "zod";

const jsonFromEnv = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }, schema);

const stripeBrandingSchema: ZodType<Stripe.Checkout.SessionCreateParams.BrandingSettings> = z.strictObject({
  background_color: z.string().optional(),
  border_style: z.enum(["pill", "rectangular", "rounded"]).optional(),
  button_color: z.string().optional(),
  display_name: z.string().optional(),
  font_family: z
    .enum([
      "default",
      "be_vietnam_pro",
      "bitter",
      "chakra_petch",
      "hahmlet",
      "inconsolata",
      "inter",
      "lato",
      "lora",
      "m_plus_1_code",
      "montserrat",
      "noto_sans",
      "noto_sans_jp",
      "noto_serif",
      "nunito",
      "open_sans",
      "pridi",
      "pt_sans",
      "pt_serif",
      "raleway",
      "roboto",
      "roboto_slab",
      "source_sans_pro",
      "titillium_web",
      "ubuntu_mono",
      "zen_maru_gothic",
    ])
    .optional(),
  icon: z
    .union([
      z.strictObject({ type: z.literal("file"), file: z.string() }),
      z.strictObject({ type: z.literal("url"), url: z.string() }),
    ])
    .optional(),
  logo: z
    .union([
      z.strictObject({ type: z.literal("file"), file: z.string() }),
      z.strictObject({ type: z.literal("url"), url: z.string() }),
    ])
    .optional(),
});

/** parseInt that returns a fallback when the input is undefined (e.g. when SKIP_ENV_VALIDATION is set). */
const safeParseInt = (fallback: number) => (value: string | undefined) => {
  const parsed = parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

// --- env ---

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["production", "development", "test", "bench"]).default("development"),
    DEBUG_DB_LOGGING: z
      .string()
      .optional()
      .default("false")
      .transform((value) => value === "true" || value === "1"),
    DATABASE_URL: z.string(),
    EDIT_TOKEN_SALT: z.string().optional(),
    NEW_EDIT_TOKEN_SECRET: z.string(),
    AUTH_SECRET: z.string(),
    AUTH_GOOGLE_ID: z.string(),
    AUTH_GOOGLE_SECRET: z.string(),
    SESSION_TTL: z.string().optional().default("10800").transform(safeParseInt(10800)),
    MAIL_FROM: z.string(),
    BRANDING_MAIL_FOOTER_TEXT: z.string(),
    BRANDING_MAIL_FOOTER_LINK: z.string(),
    BRANDING_ICAL_CALENDAR_NAME: z.string().default("Ilmomasiina"),
    ICAL_UID_DOMAIN: z.string().optional(),
    BASE_URL: z.string(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z
      .string()
      .optional()
      .transform((value) => {
        if (!value) return undefined;
        const parsed = parseInt(value, 10);
        return Number.isNaN(parsed) ? undefined : parsed;
      }),
    SMTP_TLS: z
      .string()
      .optional()
      .transform((value) => value === "true" || value === "1"),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SIGNUP_CONFIRM_MINS: z.string().optional().default("30").transform(safeParseInt(30)),
    SIGNUP_CONFIRM_AFTER_CLOSE: z
      .string()
      .optional()
      .transform((value) => value === "true" || value === "1"),
    ANONYMIZE_AFTER_DAYS: z.string().optional().default("180").transform(safeParseInt(180)),
    HIDE_EVENT_AFTER_DAYS: z.string().optional().default("180").transform(safeParseInt(180)),
    DELETION_GRACE_PERIOD_DAYS: z.string().optional().default("14").transform(safeParseInt(14)),
    CURRENCY: z.string().default("EUR"),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_CHECKOUT_EXPIRY_MINS: z.string().optional().default("30").transform(safeParseInt(30)),
    STRIPE_BRANDING_JSON: jsonFromEnv(stripeBrandingSchema).default({}),
    CRON_SECRET: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT: z.string().default("Ilmomasiina"),
    NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT_SHORT: z.string().default("Ilmomasiina"),
    NEXT_PUBLIC_BRANDING_FOOTER_GDPR_TEXT: z.string().optional(),
    NEXT_PUBLIC_BRANDING_FOOTER_GDPR_LINK: z.string().optional(),
    NEXT_PUBLIC_BRANDING_FOOTER_HOME_TEXT: z.string().optional(),
    NEXT_PUBLIC_BRANDING_FOOTER_HOME_LINK: z.string().optional(),
    NEXT_PUBLIC_BRANDING_CANCELLATION_LINK: z.string().optional(),
    NEXT_PUBLIC_DEFAULT_LANGUAGE: z.enum(["fi", "sv", "en"]).default("fi"),
    NEXT_PUBLIC_APP_TIMEZONE: z.string().default("Europe/Helsinki"),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT: process.env.NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT,
    NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT_SHORT: process.env.NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT_SHORT,
    NEXT_PUBLIC_BRANDING_FOOTER_GDPR_TEXT: process.env.NEXT_PUBLIC_BRANDING_FOOTER_GDPR_TEXT,
    NEXT_PUBLIC_BRANDING_FOOTER_GDPR_LINK: process.env.NEXT_PUBLIC_BRANDING_FOOTER_GDPR_LINK,
    NEXT_PUBLIC_BRANDING_FOOTER_HOME_TEXT: process.env.NEXT_PUBLIC_BRANDING_FOOTER_HOME_TEXT,
    NEXT_PUBLIC_BRANDING_FOOTER_HOME_LINK: process.env.NEXT_PUBLIC_BRANDING_FOOTER_HOME_LINK,
    NEXT_PUBLIC_BRANDING_CANCELLATION_LINK: process.env.NEXT_PUBLIC_BRANDING_CANCELLATION_LINK,
    NEXT_PUBLIC_DEFAULT_LANGUAGE: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE,
    NEXT_PUBLIC_APP_TIMEZONE: process.env.NEXT_PUBLIC_APP_TIMEZONE,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true" || process.env.SKIP_ENV_VALIDATION === "1",
  emptyStringAsUndefined: true,
});

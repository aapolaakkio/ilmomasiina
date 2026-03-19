import { createEnv } from "@t3-oss/env-nextjs";
import Stripe from "stripe";
import { z, ZodType } from "zod";

const booleanFromEnv = z.preprocess((value) => {
  if (value === "true" || value === "1" || value === true) return true;
  if (value === "false" || value === "0" || value === false) return false;
  return value;
}, z.boolean());

const integerFromEnv = z.preprocess((value) => {
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  return value;
}, z.number().int());

const jsonFromEnv = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }, schema);

const nullableString = z
  .string()
  .optional()
  .transform((value) => value ?? null);
const nullableInteger = integerFromEnv.optional().transform((value) => value ?? null);

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

// --- env ---

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["production", "development", "test", "bench"]).default("development"),
    DEBUG_DB_LOGGING: booleanFromEnv.default(false),
    HOST: z.string().default("localhost"),
    DEV_BACKEND_PORT: nullableInteger,
    PORT: integerFromEnv.default(3000),
    ENFORCE_HTTPS: booleanFromEnv.default(false),
    TRUST_PROXY: booleanFromEnv.default(false),
    ALLOW_ORIGIN: nullableString,
    VERSION: nullableString,
    DATABASE_URL: z.string(),
    THIS_IS_A_TEST_DB_AND_CAN_BE_WIPED: booleanFromEnv.default(false),
    EDIT_TOKEN_SALT: nullableString,
    NEW_EDIT_TOKEN_SECRET: z.string(),
    AUTH_SECRET: z.string(),
    AUTH_GOOGLE_ID: z.string(),
    AUTH_GOOGLE_SECRET: z.string(),
    SESSION_TTL: integerFromEnv.default(10800),
    MAIL_FROM: z.string(),
    BRANDING_MAIL_FOOTER_TEXT: z.string(),
    BRANDING_MAIL_FOOTER_LINK: z.string(),
    BRANDING_ICAL_CALENDAR_NAME: z.string().default("Ilmomasiina"),
    ICAL_UID_DOMAIN: nullableString,
    APP_TIMEZONE: z.string().default("Europe/Helsinki"),
    BASE_URL: z.string(),
    SMTP_HOST: nullableString,
    SMTP_PORT: nullableInteger,
    SMTP_TLS: booleanFromEnv.default(false),
    SMTP_USER: nullableString,
    SMTP_PASSWORD: nullableString,
    SIGNUP_CONFIRM_MINS: integerFromEnv.default(30),
    SIGNUP_CONFIRM_AFTER_CLOSE: booleanFromEnv.default(false),
    ANONYMIZE_AFTER_DAYS: integerFromEnv.default(180),
    HIDE_EVENT_AFTER_DAYS: integerFromEnv.default(180),
    DELETION_GRACE_PERIOD_DAYS: integerFromEnv.default(14),
    CURRENCY: z.string().default("EUR"),
    STRIPE_SECRET_KEY: nullableString,
    STRIPE_WEBHOOK_SECRET: nullableString,
    STRIPE_CHECKOUT_EXPIRY_MINS: integerFromEnv.default(30),
    STRIPE_BRANDING_JSON: jsonFromEnv(stripeBrandingSchema).default({}),
    CRON_SECRET: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT: z.string().default("Ilmomasiina"),
    NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT_SHORT: z.string().default("Ilmomasiina"),
    NEXT_PUBLIC_BRANDING_FOOTER_GDPR_TEXT: nullableString,
    NEXT_PUBLIC_BRANDING_FOOTER_GDPR_LINK: nullableString,
    NEXT_PUBLIC_BRANDING_FOOTER_HOME_TEXT: nullableString,
    NEXT_PUBLIC_BRANDING_FOOTER_HOME_LINK: nullableString,
    NEXT_PUBLIC_BRANDING_CANCELLATION_LINK: nullableString,
    NEXT_PUBLIC_DEFAULT_LANGUAGE: z.enum(["fi", "sv", "en"]).default("fi"),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DEBUG_DB_LOGGING: process.env.DEBUG_DB_LOGGING,
    HOST: process.env.HOST,
    DEV_BACKEND_PORT: process.env.DEV_BACKEND_PORT,
    PORT: process.env.PORT,
    ENFORCE_HTTPS: process.env.ENFORCE_HTTPS,
    TRUST_PROXY: process.env.TRUST_PROXY,
    ALLOW_ORIGIN: process.env.ALLOW_ORIGIN,
    VERSION: process.env.VERSION,
    DATABASE_URL: process.env.DATABASE_URL,
    THIS_IS_A_TEST_DB_AND_CAN_BE_WIPED: process.env.THIS_IS_A_TEST_DB_AND_CAN_BE_WIPED,
    EDIT_TOKEN_SALT: process.env.EDIT_TOKEN_SALT,
    NEW_EDIT_TOKEN_SECRET: process.env.NEW_EDIT_TOKEN_SECRET,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    SESSION_TTL: process.env.SESSION_TTL,
    MAIL_FROM: process.env.MAIL_FROM,
    BRANDING_MAIL_FOOTER_TEXT: process.env.BRANDING_MAIL_FOOTER_TEXT,
    BRANDING_MAIL_FOOTER_LINK: process.env.BRANDING_MAIL_FOOTER_LINK,
    BRANDING_ICAL_CALENDAR_NAME: process.env.BRANDING_ICAL_CALENDAR_NAME,
    ICAL_UID_DOMAIN: process.env.ICAL_UID_DOMAIN,
    APP_TIMEZONE: process.env.APP_TIMEZONE,
    BASE_URL: process.env.BASE_URL,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_TLS: process.env.SMTP_TLS,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    SIGNUP_CONFIRM_MINS: process.env.SIGNUP_CONFIRM_MINS,
    SIGNUP_CONFIRM_AFTER_CLOSE: process.env.SIGNUP_CONFIRM_AFTER_CLOSE,
    ANONYMIZE_AFTER_DAYS: process.env.ANONYMIZE_AFTER_DAYS,
    HIDE_EVENT_AFTER_DAYS: process.env.HIDE_EVENT_AFTER_DAYS,
    DELETION_GRACE_PERIOD_DAYS: process.env.DELETION_GRACE_PERIOD_DAYS,
    CURRENCY: process.env.CURRENCY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_CHECKOUT_EXPIRY_MINS: process.env.STRIPE_CHECKOUT_EXPIRY_MINS,
    STRIPE_BRANDING_JSON: process.env.STRIPE_BRANDING_JSON,
    CRON_SECRET: process.env.CRON_SECRET,
    NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT: process.env.NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT,
    NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT_SHORT: process.env.NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT_SHORT,
    NEXT_PUBLIC_BRANDING_FOOTER_GDPR_TEXT: process.env.NEXT_PUBLIC_BRANDING_FOOTER_GDPR_TEXT,
    NEXT_PUBLIC_BRANDING_FOOTER_GDPR_LINK: process.env.NEXT_PUBLIC_BRANDING_FOOTER_GDPR_LINK,
    NEXT_PUBLIC_BRANDING_FOOTER_HOME_TEXT: process.env.NEXT_PUBLIC_BRANDING_FOOTER_HOME_TEXT,
    NEXT_PUBLIC_BRANDING_FOOTER_HOME_LINK: process.env.NEXT_PUBLIC_BRANDING_FOOTER_HOME_LINK,
    NEXT_PUBLIC_BRANDING_CANCELLATION_LINK: process.env.NEXT_PUBLIC_BRANDING_CANCELLATION_LINK,
    NEXT_PUBLIC_DEFAULT_LANGUAGE: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true" || process.env.SKIP_ENV_VALIDATION === "1",
  emptyStringAsUndefined: false,
});

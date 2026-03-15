import { z } from "zod/v4";

import { PaymentMode } from "../../enum";
import { question, questionCreate, questionUpdate } from "../question";
import { quota, quotaCreate, quotaLanguage, quotaUpdate } from "../quota";
import { adminQuotaWithSignups, userQuotaWithSignups } from "../quotaWithSignups";
import { questionLanguage } from "../question";

export const eventSlug = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[A-Za-z0-9_-]+$/);

export const eventID = z.string().min(1).max(32).brand<"EventID">();

/** Accepts a string or Date, coerces Date to ISO string. */
const dateString = z.union([z.string(), z.date()]).transform((v) => (v instanceof Date ? v.toISOString() : v));

/** Event attributes that are not localizable and are public. */
const publicEventAttributes = z.object({
  slug: eventSlug,
  date: z.nullable(dateString),
  endDate: z.nullable(dateString),
  registrationStartDate: z.nullable(dateString),
  registrationEndDate: z.nullable(dateString),
  openQuotaSize: z.int().min(0),
  category: z.string().max(255),
  signupsPublic: z.boolean(),
  nameQuestion: z.boolean(),
  emailQuestion: z.boolean(),
  payments: z.enum(PaymentMode),
  defaultLanguage: z.string().max(8),
});

/** Event attributes that are only for admins. */
const adminOnlyEventAttributes = z.object({
  draft: z.boolean(),
  listed: z.boolean(),
});

/** Attributes shared between events/languages that are public. */
const publicCommonAttributes = z.object({
  description: z.nullable(z.string()),
  price: z.nullable(z.string().max(255)),
  location: z.nullable(z.string().max(255)),
  webpageUrl: z.nullable(z.string().max(255)),
  facebookUrl: z.nullable(z.string().max(255)),
});

/** Attributes shared between events/languages that are only for admins, only in event details. */
const adminDetailsOnlyCommonAttributes = z.object({
  verificationEmail: z.nullable(z.string()),
});

/** Language version attributes that are public. */
const publicLanguageAttributes = z.object({
  // No minLength to allow for fallback.
  title: z.string().max(255),
  quotas: z.array(quotaLanguage),
  questions: z.array(questionLanguage),
});

/** Schema for an event language version. */
export const userEventLanguage = publicCommonAttributes.extend(publicLanguageAttributes.shape);

/** Schema for an event language version for admins. */
export const adminEventLanguage = publicCommonAttributes
  .extend(publicLanguageAttributes.shape)
  .extend(adminDetailsOnlyCommonAttributes.shape);

/** Schema for the languages field for user events. */
const userEventLanguages = z.object({
  languages: z.record(z.string().max(8), userEventLanguage),
});

/** Schema for the languages field for admin events. */
const adminEventLanguages = z.object({
  languages: z.record(z.string().max(8), adminEventLanguage),
});

/**
 * Non-relation attributes for the public API.
 * Includes top-level localizable fields (title, description, etc.) reconstructed from defaultLanguage.
 */
const publicAttributes = publicEventAttributes
  .extend(publicCommonAttributes.shape)
  .extend(userEventLanguages.shape)
  .extend({ title: z.string().min(1).max(255) });

/**
 * Non-relation attributes for the admin API.
 * Includes top-level localizable fields reconstructed from defaultLanguage.
 */
const adminAttributes = publicEventAttributes
  .extend(publicCommonAttributes.shape)
  .extend(adminOnlyEventAttributes.shape)
  .extend(adminDetailsOnlyCommonAttributes.shape)
  .extend(adminEventLanguages.shape)
  .extend({ title: z.string().min(1).max(255) });

/** Response schema for fetching an event from the public API. */
export const userEventResponse = publicAttributes.extend({
  id: eventID,
  questions: z.array(question),
  quotas: z.array(userQuotaWithSignups),
  millisTillOpening: z.nullable(z.int()),
  registrationClosed: z.boolean(),
});

/** Response schema when an event is fetched as part of an editable signup. */
export const userEventForSignup = publicAttributes.extend({
  id: eventID,
  questions: z.array(question),
  quotas: z.array(quota),
});

/** Response schema for fetching or modifying an event in the admin API. */
export const adminEventResponse = adminAttributes.extend({
  id: eventID,
  questions: z.array(question),
  quotas: z.array(adminQuotaWithSignups),
  updatedAt: z.string(),
});

/** Request body for creating an event. */
export const eventCreateBody = adminAttributes.extend({
  quotas: z.array(quotaCreate),
  questions: z.array(questionCreate),
});

/** Request body for editing an existing event. */
export const eventUpdateBody = adminAttributes
  .extend({
    quotas: z.array(quotaUpdate),
    questions: z.array(questionUpdate),
    moveSignupsToQueue: z.boolean(),
    updatedAt: dateString,
  })
  .partial();

/** Path parameters necessary to fetch an event from the public API. */
export const userEventPathParams = z.object({
  slug: eventSlug,
});

/** Path parameters necessary to fetch an event from the admin API. */
export const adminEventPathParams = z.object({
  id: eventID,
});

/** Event ID type. Randomly generated alphanumeric string. */
export type EventID = z.infer<typeof eventID>;
/** Event slug type. */
export type EventSlug = z.infer<typeof eventSlug>;

/** Path parameters necessary to fetch an event from the admin API. */
export type AdminEventPathParams = z.infer<typeof adminEventPathParams>;
/** Path parameters necessary to fetch an event from the public API. */
export type UserEventPathParams = z.infer<typeof userEventPathParams>;

/** Request body for creating an event. */
export type EventCreateBody = z.infer<typeof eventCreateBody>;
/** Request body for editing an existing event. */
export type EventUpdateBody = z.infer<typeof eventUpdateBody>;

/** Response schema for fetching or modifying an event in the admin API. */
export type AdminEventResponse = z.infer<typeof adminEventResponse>;
/** Response schema for fetching an event from the public API. */
export type UserEventResponse = z.infer<typeof userEventResponse>;

/** Schema for an event language version for admins. */
export type AdminEventLanguage = z.infer<typeof adminEventLanguage>;
/** Schema for an event language version. */
export type UserEventLanguage = z.infer<typeof userEventLanguage>;

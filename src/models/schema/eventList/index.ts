import { z } from "zod/v4";

import { PaymentMode } from "../../enum";
import { questionLanguage } from "../question";
import { quotaLanguage } from "../quota";
import { quotaWithSignupCount } from "../quotaWithSignups";

/** Event attributes that are public (duplicated from event to avoid circular deps). */
const publicEventAttributes = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  date: z.nullable(z.string()),
  endDate: z.nullable(z.string()),
  registrationStartDate: z.nullable(z.string()),
  registrationEndDate: z.nullable(z.string()),
  openQuotaSize: z.int().min(0),
  category: z.string().max(255),
  signupsPublic: z.boolean(),
  nameQuestion: z.boolean(),
  emailQuestion: z.boolean(),
  payments: z.enum(PaymentMode),
  defaultLanguage: z.string().max(8),
});

const publicCommonAttributes = z.object({
  description: z.nullable(z.string()),
  price: z.nullable(z.string().max(255)),
  location: z.nullable(z.string()),
  webpageUrl: z.nullable(z.string().max(2048)),
});

const adminOnlyEventAttributes = z.object({
  draft: z.boolean(),
  listed: z.boolean(),
});

const userEventLanguage = publicCommonAttributes.extend({
  title: z.string().max(255),
  quotas: z.array(quotaLanguage),
  questions: z.array(questionLanguage),
});

const userEventLanguages = z.object({
  languages: z.record(z.string().max(8), userEventLanguage),
});

const eventIdentity = z.object({
  id: z.string(),
});

/** Schema for an item of an event list from the public API. */
const userEventListItem = eventIdentity
  .extend(publicEventAttributes.shape)
  .extend(publicCommonAttributes.shape)
  .extend(userEventLanguages.shape)
  .extend({
    quotas: z.array(quotaWithSignupCount),
  });

/** Response schema for fetching a list of events from the public API. */
export const userEventListResponse = z.array(userEventListItem);

/** Schema for an item of an event list from the admin API. */
const adminEventListItem = eventIdentity
  .extend(publicEventAttributes.shape)
  .extend(publicCommonAttributes.shape)
  .extend(adminOnlyEventAttributes.shape)
  .extend({
    quotas: z.array(quotaWithSignupCount),
  });

/** Response schema for fetching a list of events from the admin API. */
export const adminEventListResponse = z.array(adminEventListItem);

/** Query parameters applicable to the public event list API. */
export const eventListQuery = z.object({
  category: z.string().optional(),
  maxAge: z.int().optional(),
});

/** Query parameters applicable to the public event list API. */
export type EventListQuery = z.infer<typeof eventListQuery>;

/** Response schema for fetching a list of events from the public API. */
export type UserEventListResponse = z.infer<typeof userEventListResponse>;
/** Schema for an item of an event list from the public API. */
export type UserEventListItem = z.infer<typeof userEventListItem>;
/** Response schema for fetching a list of events from the admin API. */
export type AdminEventListResponse = z.infer<typeof adminEventListResponse>;
/** Schema for an item of an event list from the admin API. */
export type AdminEventListItem = z.infer<typeof adminEventListItem>;

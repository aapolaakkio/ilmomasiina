import { z } from "zod/v4";

export const quotaID = z.string().brand<"QuotaID">();

/** Schema for a quota language version. */
export const quotaLanguage = z.object({
  // No minLength to allow for fallback.
  title: z.string().max(255),
});

/** Schema for creating a quota. */
export const quotaCreate = z.object({
  title: z.string().min(1).max(255),
  size: z.nullable(z.int().min(1)),
  price: z.int().min(0),
});

/** Schema for a quota. */
export const quota = quotaCreate.extend({
  id: quotaID,
});

/** Schema for updating a quota. */
export const quotaUpdate = quotaCreate.extend({
  id: quotaID.optional(),
});

/** Quota ID type. Randomly generated alphanumeric string. */
export type QuotaID = z.infer<typeof quotaID>;

/** Schema for a quota. */
export type Quota = z.infer<typeof quota>;

/** Schema for a quota language version. */
export type QuotaLanguage = z.infer<typeof quotaLanguage>;

/** Schema for creating a quota. */
export type QuotaCreate = z.infer<typeof quotaCreate>;

/** Schema for updating a quota. */
export type QuotaUpdate = z.infer<typeof quotaUpdate>;

import { z } from "zod/v4";

import { quota } from "../quota";
import { adminSignupSchema, publicSignupSchema } from "../signup";

/** Schema for a quota with a count of its signups. */
export const quotaWithSignupCount = quota.extend({
  signupCount: z.int(),
});

/** Schema for a quota with public information of its signups. */
export const userQuotaWithSignups = quotaWithSignupCount.extend({
  signups: z.array(publicSignupSchema),
});

/** Schema for a quota with full information of its signups. */
export const adminQuotaWithSignups = quotaWithSignupCount.extend({
  signups: z.array(adminSignupSchema),
});

/** Schema for a quota with a count of its signups. */
export type QuotaWithSignupCount = z.infer<typeof quotaWithSignupCount>;
/** Schema for a quota, with public information of its signups. */
export type UserQuotaWithSignups = z.infer<typeof userQuotaWithSignups>;
/** Schema for a quota, with full information of its signups. */
export type AdminQuotaWithSignups = z.infer<typeof adminQuotaWithSignups>;

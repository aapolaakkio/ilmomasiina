import { env } from "@/env";

/** Returns the cutoff date before which unconfirmed signups are considered expired. */
export function activeSignupCutoff() {
  return new Date(Date.now() - Number(env.SIGNUP_CONFIRM_MINS || 30) * 60 * 1000);
}

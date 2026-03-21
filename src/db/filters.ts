import { env } from "@/env";

/** Returns the cutoff date before which unconfirmed signups are considered expired. */
export function activeSignupCutoff() {
  return new Date(Date.now() - env.SIGNUP_CONFIRM_MINS * 60 * 1000);
}

import { env } from "@/env";

/** Returns the cutoff date before which unconfirmed signups are considered expired. */
export function activeSignupCutoff() {
  return new Date(Date.now() - Number(env.SIGNUP_CONFIRM_MINS || 30) * 60 * 1000);
}

/** Returns the cutoff date before which events are hidden from public views. */
export function eventVisibilityCutoff() {
  return new Date(Date.now() - Number(env.HIDE_EVENT_AFTER_DAYS || 180) * 24 * 60 * 60 * 1000);
}

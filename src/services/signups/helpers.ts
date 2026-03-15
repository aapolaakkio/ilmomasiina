import { getEditableAtLeastUntil } from "../../db/computed";

interface EventLike {
  registrationStartDate: Date | null;
  registrationEndDate: Date | null;
}

interface SignupLike {
  createdAt: Date;
}

/** Checks whether signups can still be created for an event. */
export function signupsAllowed(event: EventLike): boolean {
  if (event.registrationStartDate === null || event.registrationEndDate === null) {
    return false;
  }
  const now = new Date();
  return now >= event.registrationStartDate && now <= event.registrationEndDate;
}

/** Checks whether a signup is still editable. */
export function signupEditable(event: EventLike, signup: SignupLike): boolean {
  return signupsAllowed(event) || new Date() <= getEditableAtLeastUntil(signup);
}

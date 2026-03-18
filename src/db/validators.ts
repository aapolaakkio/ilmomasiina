import CustomError from "../util/customError";

import { ErrorCode } from "@/db/schema";

export class EventValidationError extends CustomError {
  constructor(message: string, statusCode = 400) {
    super(statusCode, ErrorCode.EVENT_VALIDATION_ERROR, message);
  }
}

/**
 * Validates event date consistency.
 * Replaces Sequelize model-level validators on Event.
 */
export function validateEventDates(event: {
  date: Date | null;
  endDate: Date | null;
  registrationStartDate: Date | null;
  registrationEndDate: Date | null;
}): void {
  if (event.date != null && event.endDate != null && event.date > event.endDate) {
    throw new EventValidationError("endDate must be after or equal to date");
  }
  if (
    event.registrationStartDate != null &&
    event.registrationEndDate != null &&
    event.registrationStartDate > event.registrationEndDate
  ) {
    throw new EventValidationError("registrationEndDate must be after or equal to registrationStartDate");
  }
  if (event.date === null && event.registrationStartDate === null) {
    throw new EventValidationError("either date or registrationStartDate/registrationEndDate must be set");
  }
  if (event.date === null && event.endDate !== null) {
    throw new EventValidationError("endDate may only be set with date");
  }
  if ((event.registrationStartDate === null) !== (event.registrationEndDate === null)) {
    throw new EventValidationError("only neither or both of registrationStartDate and registrationEndDate may be set");
  }
}

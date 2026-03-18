/* eslint-disable max-classes-per-file */
import { ErrorCode } from "@/db/schema";
import type { SignupValidationErrors } from "@/db/zod";

import CustomError, { errorClass } from "../../util/customError";

export const SignupsClosed = errorClass(403, ErrorCode.SIGNUPS_CLOSED);
export const NoSuchQuota = errorClass(404, ErrorCode.NO_SUCH_QUOTA);
export const NoSuchSignup = errorClass(404, ErrorCode.NO_SUCH_SIGNUP);

export class SignupValidationError extends CustomError {
  public readonly errors: SignupValidationErrors;

  constructor(message: string, errors: SignupValidationErrors) {
    super(400, ErrorCode.SIGNUP_VALIDATION_ERROR, message);
    this.errors = errors;
  }
}

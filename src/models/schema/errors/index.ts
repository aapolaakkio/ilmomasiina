import { z } from "zod/v4";

import { ErrorCode, SignupFieldError } from "../../enum";

/** Response schema for a generic error. */
export const errorResponse = z.object({
  statusCode: z.number(),
  code: z.enum(ErrorCode).optional(),
  message: z.string(),
});

/** Response schema for an edit conflicting with another edit on the server. */
export const editConflictError = errorResponse.extend({
  updatedAt: z.string(),
  deletedQuotas: z.array(z.string()),
  deletedQuestions: z.array(z.string()),
});

/** Response schema for an edit that would move some signups back to the queue. */
export const wouldMoveSignupsToQueueError = errorResponse.extend({
  count: z.int(),
});

/** Schema for validation errors on a signup. */
const signupValidationErrors = z.object({
  firstName: z.enum(SignupFieldError).optional(),
  lastName: z.enum(SignupFieldError).optional(),
  email: z.enum(SignupFieldError).optional(),
  answers: z.record(z.string(), z.enum(SignupFieldError)).optional(),
});

/** Schema for validation errors on a signup. */
export type SignupValidationErrors = z.infer<typeof signupValidationErrors>;

/** Response schema for an invalid signup edit. */
export const signupValidationError = errorResponse.extend({
  errors: signupValidationErrors,
});

/** Response schema for a generic error. */
export type ErrorResponse = z.infer<typeof errorResponse>;
/** Response schema for an edit conflicting with another edit on the server. */
export type EditConflictError = z.infer<typeof editConflictError>;
/** Response schema for an edit that would move some signups back to the queue. */
export type WouldMoveSignupsToQueueError = z.infer<typeof wouldMoveSignupsToQueueError>;
/** Response schema for an invalid signup edit. */
export type SignupValidationError = z.infer<typeof signupValidationError>;

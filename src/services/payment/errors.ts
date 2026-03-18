import { ErrorCode } from "@/db/schema";

import { errorClass } from "../../util/customError";

export const OnlinePaymentsDisabled = errorClass(400, ErrorCode.ONLINE_PAYMENTS_DISABLED);
export const SignupNotConfirmed = errorClass(400, ErrorCode.SIGNUP_NOT_CONFIRMED);
export const SignupInQueue = errorClass(400, ErrorCode.SIGNUP_IN_QUEUE);
export const SignupAlreadyPaid = errorClass(400, ErrorCode.SIGNUP_ALREADY_PAID);
export const PaymentInProgress = errorClass(409, ErrorCode.PAYMENT_IN_PROGRESS);
export const PaymentNotRequired = errorClass(400, ErrorCode.PAYMENT_NOT_REQUIRED);
export const PaymentNotFound = errorClass(400, ErrorCode.PAYMENT_NOT_FOUND);
export const PaymentNotComplete = errorClass(400, ErrorCode.PAYMENT_NOT_COMPLETE);
export const PaymentRateLimited = errorClass(429, ErrorCode.PAYMENT_RATE_LIMITED);

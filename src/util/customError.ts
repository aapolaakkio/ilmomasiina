import { ErrorCode } from "@/db/schema";

export default abstract class CustomError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;

  protected constructor(statusCode: number, code: ErrorCode, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

/** Creates a simple CustomError subclass with a fixed status code and error code. */
export function errorClass(statusCode: number, code: ErrorCode) {
  return class extends CustomError {
    constructor(message: string) {
      super(statusCode, code, message);
    }
  };
}

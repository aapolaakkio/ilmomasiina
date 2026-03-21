import { createSafeActionClient } from "next-safe-action";
import { createMiddleware } from "next-safe-action";

import { createAdminAuditLogger, requireAdmin } from "@/auth/adminAuth";
import type { SignupID } from "@/db/schema";
import { verifyToken } from "@/services/signups/editTokens";

export class ActionError extends Error {}

/** Verifies a signup edit token, throwing an ActionError if invalid. */
export function verifyEditToken(signupId: SignupID, editToken: string) {
  if (!verifyToken(signupId, editToken)) {
    throw new ActionError("Invalid edit token");
  }
}

export const actionClient = createSafeActionClient({
  handleServerError: (error) => {
    if (error instanceof ActionError) {
      return error.message;
    }
    console.error("Unhandled server error:", error);
    return error.message;
  },
  defaultValidationErrorsShape: "flattened",
});

export const isAuthorizedMiddleware = createMiddleware().define(async ({ next }) => {
  const session = await requireAdmin();
  const auditLogger = await createAdminAuditLogger(session);
  return next({ ctx: { session, auditLogger } });
});

/** Middleware that requires the user to be an admin. Must be chained after isAuthorizedMiddleware. */
export const isAdminMiddleware = createMiddleware<{ ctx: { session: { role: string } } }>().define(
  async ({ next, ctx }) => {
    if (ctx.session.role !== "admin") throw new ActionError("Forbidden");
    return next({ ctx });
  },
);

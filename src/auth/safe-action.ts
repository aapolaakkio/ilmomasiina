import { createSafeActionClient } from "next-safe-action";
import { createMiddleware } from "next-safe-action";

import { createAdminAuditLogger, requireAdmin } from "@/auth/adminAuth";

export class ActionError extends Error {}

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

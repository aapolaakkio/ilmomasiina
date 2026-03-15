"use server";

import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { auditLoqQuery } from "@/models/schema/auditLog";
import { getAuditLogItems } from "@/services/admin/auditlog/getAuditLogs";

export const getAuditLogAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(auditLoqQuery)
  .action(async ({ parsedInput }) => {
    return getAuditLogItems(parsedInput);
  });

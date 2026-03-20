"use server";

import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { auditLogQuery } from "@/db/zod";
import { getAuditLogItems } from "@/services/admin/auditlog/getAuditLogs";

export const getAuditLogAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(auditLogQuery)
  .action(async ({ parsedInput }) => {
    return getAuditLogItems(parsedInput);
  });

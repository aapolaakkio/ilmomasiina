"use server";

import { revalidateTag, updateTag } from "next/cache";

import { requireEventAccessByQuota } from "@/auth/eventAccess";
import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { adminSignupCreateBody } from "@/db/zod";
import { createSignupAsAdmin } from "@/services/signups/updateSignup";

export const createSignupAsAdminAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(adminSignupCreateBody)
  .action(async ({ parsedInput, ctx: { session, auditLogger } }) => {
    await requireEventAccessByQuota(session, parsedInput.quotaId);
    const result = await createSignupAsAdmin(parsedInput, auditLogger, parsedInput.sendEmail ?? true);
    updateTag(`admin-event:${result.eventId}`);
    revalidateTag(`event-signups:${result.eventId}`, "max");
    revalidateTag("admin-audit-log", "max");
    return result;
  });

"use server";

import { revalidateTag, updateTag } from "next/cache";

import { requireEventAccessBySignup } from "@/auth/eventAccess";
import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { signupIdInput } from "@/db/zod";
import { deleteSignup } from "@/services/signups/deleteSignup";

export const deleteSignupAsAdminAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(signupIdInput)
  .action(async ({ parsedInput, ctx: { session, auditLogger } }) => {
    await requireEventAccessBySignup(session, parsedInput.signupId);
    const { eventId } = await deleteSignup(parsedInput.signupId, auditLogger, true);
    updateTag(`admin-event:${eventId}`);
    revalidateTag(`event-signups:${eventId}`, "max");
    revalidateTag(`signup:${parsedInput.signupId}`, "max");
    revalidateTag("admin-audit-log", "max");
  });

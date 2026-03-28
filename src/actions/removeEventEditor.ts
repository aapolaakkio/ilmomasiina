"use server";

import { revalidateTag, updateTag } from "next/cache";

import { requireEventAccess } from "@/auth/eventAccess";
import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { removeEventEditorSchema } from "@/db/zod";
import { removeEventEditor } from "@/services/admin/events/eventEditors";

export const removeEventEditorAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(removeEventEditorSchema)
  .action(async ({ parsedInput, ctx: { session, auditLogger } }) => {
    await requireEventAccess(session, parsedInput.eventId);
    await removeEventEditor(parsedInput.eventId, parsedInput.userId, auditLogger);
    updateTag(`admin-event:${parsedInput.eventId}`);
    revalidateTag("admin-audit-log", "max");
  });

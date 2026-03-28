"use server";

import { revalidateTag, updateTag } from "next/cache";

import { requireEventAccess } from "@/auth/eventAccess";
import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { addEventEditorSchema } from "@/db/zod";
import { addEventEditor } from "@/services/admin/events/eventEditors";

export const addEventEditorAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(addEventEditorSchema)
  .action(async ({ parsedInput, ctx: { session, auditLogger } }) => {
    await requireEventAccess(session, parsedInput.eventId);
    const result = await addEventEditor(parsedInput.eventId, parsedInput.email, auditLogger);
    updateTag(`admin-event:${parsedInput.eventId}`);
    revalidateTag("admin-audit-log", "max");
    return result;
  });

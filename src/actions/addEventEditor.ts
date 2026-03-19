"use server";

import { requireEventAccess } from "@/auth/eventAccess";
import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { addEventEditorSchema } from "@/db/zod";
import { addEventEditor } from "@/services/admin/events/eventEditors";

export const addEventEditorAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(addEventEditorSchema)
  .action(async ({ parsedInput, ctx: { session, auditLogger } }) => {
    await requireEventAccess(session, parsedInput.eventId);
    return addEventEditor(parsedInput.eventId, parsedInput.email, auditLogger);
  });

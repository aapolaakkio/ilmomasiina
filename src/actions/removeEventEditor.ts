"use server";

import { requireEventAccess } from "@/auth/eventAccess";
import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { eventID, userID } from "@/db/schema";
import { removeEventEditor } from "@/services/admin/events/eventEditors";
import { z } from "zod/v4";

const removeEventEditorSchema = z.object({
  eventId: eventID,
  userId: userID,
});

export const removeEventEditorAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(removeEventEditorSchema)
  .action(async ({ parsedInput, ctx: { session, auditLogger } }) => {
    await requireEventAccess(session, parsedInput.eventId);
    await removeEventEditor(parsedInput.eventId, parsedInput.userId, auditLogger);
  });

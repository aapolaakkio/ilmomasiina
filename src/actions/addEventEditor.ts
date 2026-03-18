"use server";

import { requireEventAccess } from "@/auth/eventAccess";
import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { eventID } from "@/db/schema";
import { addEventEditor } from "@/services/admin/events/eventEditors";
import { z } from "zod/v4";

const addEventEditorSchema = z.object({
  eventId: eventID,
  email: z.email().min(1).max(255),
});

export const addEventEditorAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(addEventEditorSchema)
  .action(async ({ parsedInput, ctx: { session, auditLogger } }) => {
    await requireEventAccess(session, parsedInput.eventId);
    return addEventEditor(parsedInput.eventId, parsedInput.email, auditLogger);
  });

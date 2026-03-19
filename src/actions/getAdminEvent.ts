"use server";

import { hasEventAccess } from "@/auth/eventAccess";
import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { eventIdInput } from "@/db/zod";
import { getEventByIdForAdmin, getEventByIdForViewer } from "@/services/events/getEventDetails";

export const getAdminEventAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(eventIdInput)
  .action(async ({ parsedInput, ctx: { session } }) => {
    const canEdit = await hasEventAccess(session, parsedInput.eventId);
    if (canEdit) {
      return getEventByIdForAdmin(parsedInput.eventId);
    }
    return getEventByIdForViewer(parsedInput.eventId);
  });

"use server";

import { z } from "zod/v4";

import { hasEventAccess } from "@/auth/eventAccess";
import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { eventID } from "@/db/schema";
import { getEventByIdForAdmin, getEventByIdForViewer } from "@/services/events/getEventDetails";

export const getAdminEventAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(z.object({ id: eventID }))
  .action(async ({ parsedInput, ctx: { session } }) => {
    const canEdit = await hasEventAccess(session, parsedInput.id);
    if (canEdit) {
      return getEventByIdForAdmin(parsedInput.id);
    }
    return getEventByIdForViewer(parsedInput.id);
  });

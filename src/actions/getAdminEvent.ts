"use server";

import { hasEventAccess } from "@/auth/eventAccess";
import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { adminEventPathParams } from "@/models/schema/event";
import { getEventByIdForAdmin, getEventByIdForViewer } from "@/services/events/getEventDetails";

export const getAdminEventAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(adminEventPathParams)
  .action(async ({ parsedInput, ctx: { session } }) => {
    const canEdit = await hasEventAccess(session, parsedInput.id);
    if (canEdit) {
      return getEventByIdForAdmin(parsedInput.id);
    }
    return getEventByIdForViewer(parsedInput.id);
  });

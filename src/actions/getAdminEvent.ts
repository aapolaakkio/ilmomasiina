"use server";

import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { adminEventPathParams } from "@/models/schema/event";
import { getEventByIdForAdmin } from "@/services/events/getEventDetails";

export const getAdminEventAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(adminEventPathParams)
  .action(async ({ parsedInput }) => {
    return getEventByIdForAdmin(parsedInput.id);
  });

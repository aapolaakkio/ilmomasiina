"use server";

import { revalidateTag, updateTag } from "next/cache";

import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { eventCreateBody } from "@/db/zod";
import { createEvent } from "@/services/admin/events/createEvent";

export const createEventAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(eventCreateBody)
  .action(async ({ parsedInput, ctx: { session, auditLogger } }) => {
    const result = await createEvent(parsedInput, auditLogger, session.user);
    updateTag("admin-event-list");
    revalidateTag("event-list", "max");
    revalidateTag("categories", "max");
    revalidateTag("ical-feed", "max");
    return result;
  });

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { eventID } from "@/models/schema/event";
import { deleteEvent } from "@/services/admin/events/deleteEvent";

const schema = z.object({
  eventId: eventID,
});

export const deleteEventAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { auditLogger } }) => {
    await deleteEvent(parsedInput.eventId, auditLogger);
    revalidatePath("/admin");
    revalidatePath("/");
  });

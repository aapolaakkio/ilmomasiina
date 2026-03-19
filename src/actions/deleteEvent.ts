"use server";

import { revalidatePath } from "next/cache";

import { requireEventAccess } from "@/auth/eventAccess";
import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { eventIdInput } from "@/db/zod";
import { deleteEvent } from "@/services/admin/events/deleteEvent";

export const deleteEventAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(eventIdInput)
  .action(async ({ parsedInput, ctx: { session, auditLogger } }) => {
    await requireEventAccess(session, parsedInput.eventId);
    await deleteEvent(parsedInput.eventId, auditLogger);
    revalidatePath("/admin");
    revalidatePath("/");
  });

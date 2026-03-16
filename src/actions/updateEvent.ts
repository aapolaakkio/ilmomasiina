"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

import { requireEventAccess } from "@/auth/eventAccess";
import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { eventID, eventUpdateBody } from "@/models/schema/event";
import { updateEvent } from "@/services/admin/events/updateEvent";
import { EditConflict, WouldMoveSignupsToQueue } from "@/services/admin/events/errors";

const schema = z.object({
  eventId: eventID,
  body: eventUpdateBody,
});

export const updateEventAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { session, auditLogger } }) => {
    await requireEventAccess(session, parsedInput.eventId);
    try {
      const result = await updateEvent(parsedInput.eventId, parsedInput.body, auditLogger);
      revalidatePath("/admin");
      revalidatePath("/");
      return result;
    } catch (err) {
      if (err instanceof EditConflict) {
        return {
          editConflict: true as const,
          updatedAt: err.updatedAt,
          deletedQuotas: err.deletedQuotas,
          deletedQuestions: err.deletedQuestions,
        };
      }
      if (err instanceof WouldMoveSignupsToQueue) {
        return {
          wouldMoveToQueue: true as const,
          count: err.count,
        };
      }
      throw err;
    }
  });

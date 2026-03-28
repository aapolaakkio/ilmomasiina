"use server";

import { revalidateTag, updateTag } from "next/cache";

import { requireEventAccess } from "@/auth/eventAccess";
import { actionClient, isAuthorizedMiddleware } from "@/auth/safe-action";
import { eventIdInput, eventUpdateBody } from "@/db/zod";
import { updateEvent } from "@/services/admin/events/updateEvent";
import { EditConflict, WouldMoveSignupsToQueue } from "@/services/admin/events/errors";

const schema = eventIdInput.extend({
  body: eventUpdateBody,
});

export const updateEventAction = actionClient
  .use(isAuthorizedMiddleware)
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { session, auditLogger } }) => {
    await requireEventAccess(session, parsedInput.eventId);
    try {
      const result = await updateEvent(parsedInput.eventId, parsedInput.body, auditLogger);
      updateTag("admin-event-list");
      updateTag(`admin-event:${parsedInput.eventId}`);
      revalidateTag("event-list", "max");
      revalidateTag(`event:${parsedInput.eventId}`, "max");
      revalidateTag(`event-signups:${parsedInput.eventId}`, "max");
      revalidateTag("categories", "max");
      revalidateTag("ical-feed", "max");
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

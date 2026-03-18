import { eq } from "drizzle-orm";

import { AuditEvent, type EventID } from "@/db/schema";

import type { AuditLogger } from "../../../auditlog";
import { db } from "../../../db";
import { events } from "../../../db/schema";

/** Delete an event by ID. */
export async function deleteEvent(eventId: EventID, auditLogger: AuditLogger): Promise<void> {
  await db.transaction(async (tx) => {
    const event = await tx.query.events.findFirst({
      where: { id: { eq: eventId } },
      columns: { id: true, slug: true, title: true },
    });

    if (!event) throw new Error("No event found with id");

    // Rename slug before soft-delete to free it up (replaces Sequelize beforeDestroy hook)
    const deletedSlug = `${event.slug.substring(0, 100)}-deleted-${Date.now()}`;
    await tx
      .update(events)
      .set({ slug: deletedSlug, deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(events.id, eventId));

    await auditLogger(AuditEvent.DELETE_EVENT, {
      event: { id: event.id, title: event.title },
      tx,
    });
  });
}

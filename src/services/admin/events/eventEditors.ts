import { and, eq } from "drizzle-orm";

import type { EventID, UserID } from "@/db/schema";

import type { AuditLogger } from "../../../auditlog";
import { db } from "../../../db";
import { eventEditors, UserRole } from "../../../db/schema";

/** List editors of an event (excluding admins, who always have access). */
export async function getEventEditors(eventId: EventID): Promise<{ userId: UserID; email: string }[]> {
  const rows = await db.query.eventEditors.findMany({
    where: {
      eventId: { eq: eventId },
      user: {
        role: { eq: UserRole.USER },
      },
    },
    columns: { userId: true },
    with: {
      user: {
        columns: { email: true },
      },
    },
  });

  return rows.map((row) => ({
    userId: row.userId,
    email: row.user?.email ?? "",
  }));
}

/** Add a user as an editor of an event by email. Skips if user is an admin or already an editor. */
export async function addEventEditor(
  eventId: EventID,
  email: string,
  _auditLogger: AuditLogger,
): Promise<{ userId: UserID; email: string }> {
  const user = await db.query.users.findFirst({
    where: { email },
    columns: { id: true, email: true, role: true },
  });
  if (!user) throw new Error("User not found");
  if (user.role === "admin") throw new Error("Admins always have access");

  // Upsert: ignore if already exists
  await db.insert(eventEditors).values({ eventId, userId: user.id }).onConflictDoNothing();

  return { userId: user.id, email: user.email };
}

/** Remove a user from the editors of an event. */
export async function removeEventEditor(eventId: EventID, userId: UserID, _auditLogger: AuditLogger): Promise<void> {
  await db.delete(eventEditors).where(and(eq(eventEditors.eventId, eventId), eq(eventEditors.userId, userId)));
}

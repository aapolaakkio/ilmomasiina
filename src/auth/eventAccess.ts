import { db } from "@/db";
import type { EventID, QuotaID, SignupID } from "@/models";

import type { AdminTokenData } from "./adminAuth";
import { ActionError } from "./safe-action";

/** Check if the user has editor access to the given event. Admins always have access. */
export async function hasEventAccess(session: AdminTokenData, eventId: EventID): Promise<boolean> {
  if (session.role === "admin") return true;
  const editor = await db.query.eventEditors.findFirst({
    where: { eventId, userId: session.user },
    columns: { userId: true },
  });
  return !!editor;
}

/** Ensure the user has access to the given event. Throws if not. */
export async function requireEventAccess(session: AdminTokenData, eventId: EventID): Promise<void> {
  if (!(await hasEventAccess(session, eventId))) {
    throw new ActionError("Forbidden");
  }
}

/** Ensure the user has access to the event that owns the given quota. */
export async function requireEventAccessByQuota(session: AdminTokenData, quotaId: QuotaID): Promise<void> {
  if (session.role === "admin") return;
  const quota = await db.query.quotas.findFirst({
    where: { id: quotaId },
    columns: { eventId: true },
  });
  if (!quota) throw new ActionError("Not found");
  await requireEventAccess(session, quota.eventId as EventID);
}

/** Ensure the user has access to the event that owns the given signup. */
export async function requireEventAccessBySignup(session: AdminTokenData, signupId: SignupID): Promise<void> {
  if (session.role === "admin") return;
  const signup = await db.query.signups.findFirst({
    where: { id: signupId },
    columns: { quotaId: true },
  });
  if (!signup) throw new ActionError("Not found");
  await requireEventAccessByQuota(session, signup.quotaId as QuotaID);
}

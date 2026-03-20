import { getEffectiveEndDate } from "@/db/computed";
import type { AdminEventListResponse } from "@/db/zod";

export function isEventInPast(event: AdminEventListResponse[number]): boolean {
  const endDate = getEffectiveEndDate(event);
  return endDate != null && endDate < Date.now();
}

export function totalSignups(event: AdminEventListResponse[number]): number {
  return event.quotas.reduce((sum, q) => sum + q.signupCount, 0);
}

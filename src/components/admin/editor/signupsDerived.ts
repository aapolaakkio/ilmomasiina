import { SignupStatus } from "@/db/schema";
import type { AdminEventResponse, AdminSignupSchema } from "@/db/zod";

export type FlatSignup = AdminSignupSchema & {
  quotaTitle: string;
  quotaId: string;
  quotaSize: number | null;
};

export type QuotaGroup = { key: string; title: string; signups: FlatSignup[] };

/** Flat list + grouped view model for the signups tab. */
export function signupsAndQuotaGroups(savedEvent: AdminEventResponse | null): {
  signups: FlatSignup[];
  quotaGroups: QuotaGroup[];
} {
  if (!savedEvent) {
    return { signups: [], quotaGroups: [] };
  }
  const signups: FlatSignup[] = savedEvent.quotas.flatMap((q) =>
    q.signups.map((s) => ({ ...s, quotaTitle: q.title, quotaId: q.id, quotaSize: q.size })),
  );
  const quotaGroups: QuotaGroup[] = savedEvent.quotas.map((q) => ({
    key: q.id,
    title: q.title,
    signups: signups.filter((s) => s.quotaId === q.id && s.status === SignupStatus.IN_QUOTA),
  }));
  const openSignups = signups.filter((s) => s.status === SignupStatus.IN_OPEN_QUOTA);
  if (openSignups.length > 0) {
    quotaGroups.push({ key: "open", title: "Open quota", signups: openSignups });
  }
  const queueSignups = signups.filter((s) => s.status === SignupStatus.IN_QUEUE);
  if (queueSignups.length > 0) {
    quotaGroups.push({ key: "queue", title: "Queue", signups: queueSignups });
  }
  return { signups, quotaGroups };
}

export function formatSignupPrice(signup: Pick<FlatSignup, "price" | "currency">): string {
  if (signup.price == null) return "\u2014";
  return `${(signup.price / 100).toFixed(2)} ${signup.currency ?? ""}`.trim();
}

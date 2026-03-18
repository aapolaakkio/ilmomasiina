import { QuotaID, SignupID, SignupStatus } from "@/db/schema";

export interface SignupForPositioning {
  id: SignupID;
  quotaId: string;
}

export interface QuotaForPositioning {
  id: QuotaID;
  size: number | null;
}

export interface SignupPosition {
  status: SignupStatus;
  position: number;
}

/**
 * Pure computation: assigns a status and position to each signup based on quota sizes and open quota.
 * Signups must be pre-sorted by (createdAt, id).
 */
export function assignSignupPositions(
  signups: SignupForPositioning[],
  quotas: QuotaForPositioning[],
  openQuotaSize: number,
): Map<string, SignupPosition> {
  const result = new Map<string, SignupPosition>();
  const quotaFills = new Map<string, number>();
  let inOpenQuota = 0;
  let inQueue = 0;

  for (const signup of signups) {
    let status: SignupStatus;
    let position: number;

    let inChosenQuota = quotaFills.get(signup.quotaId) ?? 0;
    const quotaDef = quotas.find((q) => q.id === signup.quotaId);
    const chosenQuotaSize = quotaDef?.size ?? Infinity;

    if (inChosenQuota < chosenQuotaSize) {
      inChosenQuota += 1;
      quotaFills.set(signup.quotaId, inChosenQuota);
      status = SignupStatus.IN_QUOTA;
      position = inChosenQuota;
    } else if (inOpenQuota < openQuotaSize) {
      inOpenQuota += 1;
      status = SignupStatus.IN_OPEN_QUOTA;
      position = inOpenQuota;
    } else {
      inQueue += 1;
      status = SignupStatus.IN_QUEUE;
      position = inQueue;
    }

    result.set(signup.id, { status, position });
  }

  return result;
}

/** Computes positions from a nested event query result (quotas → signups). */
export function computePositionsFromEvent(event: {
  openQuotaSize: number;
  quotas: { id: QuotaID; size: number | null; signups: { id: SignupID; quotaId: string; createdAt: Date }[] }[];
}): Map<string, SignupPosition> {
  const allSignups = event.quotas
    .flatMap((q) => q.signups)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));

  return assignSignupPositions(allSignups, event.quotas, event.openQuotaSize);
}

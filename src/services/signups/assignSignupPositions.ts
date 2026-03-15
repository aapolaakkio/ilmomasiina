import { SignupStatus } from "@/models";

export interface SignupForPositioning {
  id: string;
  quotaId: string;
}

export interface QuotaForPositioning {
  id: string;
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

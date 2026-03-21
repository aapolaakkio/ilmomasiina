type SaveErrorResult = {
  serverError?: string;
  validationErrors?: unknown;
};

/**
 * Handles `serverError` and `validationErrors` from next-safe-action results.
 * @returns true if the result was an error (caller should not interpret `data`).
 */
export function isSaveErrorResult(result: SaveErrorResult | undefined) {
  if (result?.validationErrors) {
    console.error("Validation errors:", result.validationErrors);
    return true;
  }
  if (result?.serverError != null && result.serverError !== "") return true;
  return false;
}

/** `updateEventAction` success body: persisted event, not edit-conflict / move-to-queue. */
export function isSuccessfulPlainEventSavePayload(data: unknown) {
  if (!data || typeof data !== "object") return false;
  if ("editConflict" in data || "wouldMoveToQueue" in data) return false;
  return "id" in data;
}

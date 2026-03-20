type SaveErrorResult = {
  serverError?: string;
  validationErrors?: unknown;
};

/**
 * Handles `serverError` and `validationErrors` from next-safe-action results.
 * @returns true if the result was an error (caller should not interpret `data`).
 */
export function consumeSaveErrorResult(
  result: SaveErrorResult | undefined,
  labels: { invalid: string },
  setError: (message: string) => void,
): boolean {
  if (result?.serverError) {
    setError(result.serverError);
    return true;
  }
  if (result?.validationErrors) {
    console.error("Validation errors:", result.validationErrors);
    setError(labels.invalid);
    return true;
  }
  return false;
}

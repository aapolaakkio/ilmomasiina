/** First scalar for a search param (Next may use `string[]` when a key is repeated). */
export function firstSearchParam(value: string | string[] | undefined) {
  if (value === undefined) return undefined;
  const s = Array.isArray(value) ? value[0] : value;
  return s === "" ? undefined : s;
}

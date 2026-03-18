/** Converts given value to a Date if it is a string, and otherwise just passthroughs the input */
// eslint-disable-next-line import/prefer-default-export
export function toDate<T>(s: T): Date | Exclude<T, string> {
  return typeof s === "string" ? new Date(s) : (s as Exclude<T, string>);
}

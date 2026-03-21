/** Converts given value to a Date if it is a string, and otherwise just passthroughs the input */
export function toDate<T>(s: T) {
  return typeof s === "string" ? new Date(s) : (s as Exclude<T, string>);
}

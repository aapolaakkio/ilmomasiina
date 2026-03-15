/** Converts given value to a Date if it is a string, and otherwise just passthroughs the input */
// eslint-disable-next-line import/prefer-default-export
export function toDate<T>(s: T): Date | Exclude<T, string> {
  return typeof s === "string" ? new Date(s) : (s as Exclude<T, string>);
}

/** Utility type that converts fields in the imported API to string. */
export type StringifyApi<T> = {
  [P in keyof T]: T[P] extends (infer E)[]
    ? StringifyApi<E>[]
    : T[P] extends Date | null
      ? null extends T[P]
        ? string | null
        : string
      : T[P] extends boolean | number | string | null
        ? T[P]
        : StringifyApi<T[P]>;
};

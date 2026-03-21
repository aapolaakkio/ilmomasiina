/** Sums up the values returned by `getValue` for each item. */
export function sumBy<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce((sum, item) => sum + getValue(item), 0);
}

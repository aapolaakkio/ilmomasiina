const debugPatterns =
  process.env.DEBUG?.split(",")
    .map((pattern) => pattern.trim())
    .filter(Boolean) ?? [];

function isDebugEnabled(namespace: string): boolean {
  if (debugPatterns.length === 0) return false;
  return debugPatterns.some((pattern) => {
    if (pattern === "*") return true;
    if (pattern.endsWith("*")) return namespace.startsWith(pattern.slice(0, -1));
    return namespace === pattern;
  });
}

// eslint-disable-next-line no-console
const noop = () => {};

export function createDebugLogger(namespace: string): (...args: unknown[]) => void {
  if (!isDebugEnabled(namespace)) return noop;
  // eslint-disable-next-line no-console
  return (...args: unknown[]) => console.debug(`[${namespace}]`, ...args);
}

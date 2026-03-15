/** Admin session TTL in seconds. 1 year in development, 3 hours in production. */
// Uses process.env directly because this is imported by middleware (proxy.ts)
// which cannot use the validated env module.
export const SESSION_TTL = process.env.NODE_ENV === "development" ? 365 * 24 * 60 * 60 : 60 * 60 * 3;

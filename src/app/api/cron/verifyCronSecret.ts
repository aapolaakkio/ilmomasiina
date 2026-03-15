import { env } from "@/env";

/** Verify the Authorization header matches the CRON_SECRET. */
export function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  const [scheme, token] = authHeader.split(" ", 2);
  return scheme === "Bearer" && token === env.CRON_SECRET;
}

import { createSigner, createVerifier } from "fast-jwt";
import { cookies } from "next/headers";

import type { UserID } from "@/models";

import { env } from "@/env";
import { SESSION_TTL } from "./constants";

export interface AdminTokenData {
  user: UserID;
  email: string;
}

function getSecret(): string {
  return env.FEATHERS_AUTH_SECRET;
}

/** Verify the admin JWT from the cookie. Returns token data or null if invalid. */
export async function verifyAdminSession(): Promise<AdminTokenData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;

  try {
    const verify = createVerifier({ key: getSecret(), maxAge: SESSION_TTL * 1000 });
    const data = verify(token);
    return { user: parseInt(data.user) as UserID, email: data.email || "" };
  } catch {
    return null;
  }
}

/** Create a new admin JWT for the given user. */
export function createAdminToken(userId: UserID, email: string): string {
  const sign = createSigner({ key: getSecret(), expiresIn: SESSION_TTL * 1000 });
  return sign({ user: userId, email });
}

/** Set the admin auth cookie. */
export async function setAdminCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("admin_token", token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL,
    path: "/",
  });
}

/** Clear the admin auth cookie. */
export async function clearAdminCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("admin_token");
}

/** Session TTL in seconds, exported for client-side renewal logic. */
export const ADMIN_SESSION_TTL = SESSION_TTL;

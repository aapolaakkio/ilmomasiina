import { encode } from "next-auth/jwt";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { env } from "@/env";

/**
 * Mint a valid Auth.js session cookie for a DB user. Only for non-production (local e2e / staging).
 */
export async function POST(req: Request) {
  if (env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email =
    typeof body === "object" &&
    body !== null &&
    "email" in body &&
    typeof (body as { email: unknown }).email === "string"
      ? (body as { email: string }).email.trim()
      : "";

  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const dbUser = await db.query.users.findFirst({
    where: { email },
    columns: { id: true, role: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const token = await encode({
    secret: env.AUTH_SECRET,
    salt: "authjs.session-token",
    maxAge: env.SESSION_TTL,
    token: {
      sub: String(dbUser.id),
      email,
      name: email,
      dbUserId: dbUser.id,
      dbUserRole: dbUser.role,
    },
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("authjs.session-token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false,
  });
  return res;
}

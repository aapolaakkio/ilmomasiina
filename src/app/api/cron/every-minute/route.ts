import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import deleteUnconfirmedSignups from "@/cron/deleteUnconfirmedSignups";

import { verifyCronSecret } from "../verifyCronSecret";

export const runtime = "nodejs";

export async function POST(request: NextRequest, _context: RouteContext<"/api/cron/every-minute">) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await deleteUnconfirmedSignups();

  return NextResponse.json({ ok: true });
}

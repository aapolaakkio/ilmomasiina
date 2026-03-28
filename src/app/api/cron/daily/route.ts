import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import anonymizeOldSignups from "@/cron/anonymizeOldSignups";
import deleteOldAuditLogs from "@/cron/deleteOldAuditLogs";
import removeDeletedData from "@/cron/removeDeletedData";

import { verifyCronSecret } from "../verifyCronSecret";

export async function POST(request: NextRequest, _context: RouteContext<"/api/cron/daily">) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await anonymizeOldSignups();
  await removeDeletedData();
  await deleteOldAuditLogs();

  return NextResponse.json({ ok: true });
}

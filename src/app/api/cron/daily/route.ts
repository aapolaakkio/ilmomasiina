import { NextResponse } from "next/server";

import anonymizeOldSignups from "@/cron/anonymizeOldSignups";
import deleteOldAuditLogs from "@/cron/deleteOldAuditLogs";
import removeDeletedData from "@/cron/removeDeletedData";

import { verifyCronSecret } from "../verifyCronSecret";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await anonymizeOldSignups();
  await removeDeletedData();
  await deleteOldAuditLogs();

  return NextResponse.json({ ok: true });
}

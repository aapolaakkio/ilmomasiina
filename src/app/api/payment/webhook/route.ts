import { NextRequest, NextResponse } from "next/server";

import { handleStripeWebhook } from "@/services/payment/webhook";

export const runtime = "nodejs";

export async function POST(request: NextRequest, _context: RouteContext<"/api/payment/webhook">) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const result = await handleStripeWebhook(rawBody, signature);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ received: true });
}

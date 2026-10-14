import { NextResponse } from "next/server";
import { handleStripeWebhook } from "@/lib/stripe-webhook";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const payload = await req.text();
  const result = await handleStripeWebhook({
    payload,
    signature: req.headers.get("stripe-signature"),
  });
  return NextResponse.json(result.body, { status: result.status });
}

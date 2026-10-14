import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cancelSubscriptionAtPeriodEnd } from "@/lib/stripe-client";
import { CARD_OFF_MESSAGE, cardPaymentsEnabled } from "@/lib/stripe-checkout";
import { listCardPayments, markSubscriptionCancelling } from "@/lib/payment-ledger";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let email: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    email = user?.email ?? null;
  } catch {
    email = null;
  }
  if (!email) return NextResponse.json({ error: "Authentication required. Please log in." }, { status: 401 });
  if (!cardPaymentsEnabled()) return NextResponse.json({ error: CARD_OFF_MESSAGE }, { status: 403 });

  let subscriptionId = "";
  try {
    const body = await req.json() as { subscriptionId?: string };
    subscriptionId = (body.subscriptionId || "").trim();
  } catch {
    subscriptionId = "";
  }
  if (!subscriptionId) return NextResponse.json({ error: "That subscription is not on your account." }, { status: 400 });

  const ledger = await listCardPayments(email);
  if (!ledger.available) {
    return NextResponse.json({ error: "Billing history isn't available yet." }, { status: 503 });
  }
  const row = ledger.rows.find((item) => item.stripe_subscription_id === subscriptionId && item.method === "card");
  if (!row) return NextResponse.json({ error: "That subscription is not on your account." }, { status: 404 });
  if (row.cancel_at_period_end) return NextResponse.json({ ok: true, cancelAtPeriodEnd: true });

  try {
    await cancelSubscriptionAtPeriodEnd(subscriptionId);
  } catch (err) {
    console.warn(`pcb card cancel failed (${err instanceof Error ? err.message : "stripe"})`);
    return NextResponse.json({ error: "The subscription could not be cancelled. Try again from Billing." }, { status: 502 });
  }
  const marked = await markSubscriptionCancelling(email, subscriptionId);
  if (marked === "unavailable") {
    return NextResponse.json({ error: "Stripe accepted the cancellation, but Billing could not save it yet." }, { status: 503 });
  }
  return NextResponse.json({ ok: true, cancelAtPeriodEnd: true });
}

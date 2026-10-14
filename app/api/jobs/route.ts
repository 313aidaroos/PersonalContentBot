// Change note (Claude, Sep 2026): Sign-in required; lists only your jobs. See docs/LAUNCH_NOTES.md.
// Card payments (2026-10-14): payment "card" runs a clip from a completed Checkout Session and does not call the Wallet.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { listJobs } from "@/lib/db";
import { CardClipError, queueAndRunWithCardPayment, queueAndRunWithPayment } from "@/lib/pipeline";
import { toPublicJob } from "@/lib/public-job";
import { createClient } from "@/lib/supabase/server";
import { apixisOwner, apixisSubOf } from "@/lib/apixis-login";
import { CARD_OFF_MESSAGE, cardPaymentsEnabled } from "@/lib/stripe-checkout";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Authentication required. Please log in." }, { status: 401 });
  try {
    const jobs = await listJobs(user.email, apixisSubOf(user));
    return NextResponse.json({ jobs: jobs.map(toPublicJob) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  // Auth check BEFORE reading body (money route safety rule)
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user || !user.email || !user.email_confirmed_at) {
    return NextResponse.json(
      { error: "Authentication required. Please log in." },
      { status: 401 }
    );
  }

  // Now safe to read body
  try {
    const body = (await req.json()) as {
      idea?: string;
      niche?: string;
      orientation?: "vertical" | "horizontal";
      attemptId?: string;
      payment?: string;
      checkoutSessionId?: string;
    } | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid video request" }, { status: 400 });
    }

    if (body.payment === "card") {
      if (!cardPaymentsEnabled()) {
        return NextResponse.json({ error: CARD_OFF_MESSAGE }, { status: 403 });
      }
      if (typeof body.checkoutSessionId !== "string" || !body.checkoutSessionId.trim()) {
        return NextResponse.json({ error: "A completed card payment is required for this clip." }, { status: 402 });
      }
      try {
        const job = await queueAndRunWithCardPayment({
          ownerEmail: user.email,
          checkoutSessionId: body.checkoutSessionId.trim(),
        });
        return NextResponse.json({ job: toPublicJob(job) }, { status: 201 });
      } catch (err) {
        if (err instanceof CardClipError) return NextResponse.json({ error: err.message }, { status: err.status });
        console.warn(`pcb card job failed (${err instanceof Error ? err.message : "clip"})`);
        return NextResponse.json({ error: "The clip could not be started." }, { status: 500 });
      }
    }

    if (body.payment !== undefined && body.payment !== "ixis") {
      return NextResponse.json({ error: "Invalid video request" }, { status: 400 });
    }

    if (!body || typeof body !== "object" || typeof body.attemptId !== "string" || !/^[a-zA-Z0-9-]{10,50}$/.test(body.attemptId)) {
      return NextResponse.json(
        { error: "attemptId required (10-50 chars, stable per button click)" },
        { status: 400 }
      );
    }

    if (typeof body.idea !== "string" || (body.niche !== undefined && typeof body.niche !== "string") || (body.orientation !== undefined && !["vertical", "horizontal"].includes(body.orientation))) {
      return NextResponse.json({ error: "Invalid video request" }, { status: 400 });
    }

    const job = await queueAndRunWithPayment({
      idea: body.idea || "",
      niche: body.niche,
      orientation: body.orientation,
      ownerEmail: user.email,
      walletOwner: (await apixisOwner(user.email)) ?? user.email,
      attemptId: body.attemptId,
    });
    return NextResponse.json({ job: toPublicJob(job) }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    let status = 500;
    if (message.includes("too short") || message.includes("too long")) status = 400;
    if (message.includes("Not enough Ixis")) status = 402;
    return NextResponse.json({ error: message }, { status });
  }
}

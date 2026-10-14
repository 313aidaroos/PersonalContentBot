import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/stripe-client";
import {
  CARD_NOT_CONFIGURED,
  CARD_OFF_MESSAGE,
  appBaseUrl,
  buildCheckoutParams,
  cardPaymentsEnabled,
  priceIdForSku,
  skuById,
} from "@/lib/stripe-checkout";

export const dynamic = "force-dynamic";

async function signedInEmail(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email || !user.email_confirmed_at) return null;
    return user.email;
  } catch {
    return null;
  }
}

export async function GET() {
  return NextResponse.json({ enabled: cardPaymentsEnabled() });
}

export async function POST(req: Request) {
  const email = await signedInEmail();
  if (!email) return NextResponse.json({ error: "Authentication required. Please log in." }, { status: 401 });
  if (!cardPaymentsEnabled()) return NextResponse.json({ error: CARD_OFF_MESSAGE }, { status: 403 });

  let body: {
    sku?: string;
    returnTo?: string;
    attemptId?: string;
    idea?: string;
    niche?: string;
    orientation?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  const sku = body.sku ? skuById(body.sku) : undefined;
  if (!sku) return NextResponse.json({ error: "Unknown product." }, { status: 400 });
  const priceId = priceIdForSku(sku.id);
  if (!priceId) return NextResponse.json({ error: CARD_NOT_CONFIGURED }, { status: 503 });

  const returnTo = body.returnTo === "home" || body.returnTo === "pricing" ? body.returnTo : "billing";
  const extra: Record<string, string> = { owner_email: email.toLowerCase() };

  if (sku.id === "contentbot.clip") {
    const idea = (body.idea || "").trim();
    if (idea.length < 3 || idea.length > 280) return NextResponse.json({ error: "Idea is too short" }, { status: 400 });
    if (typeof body.attemptId !== "string" || !/^[a-zA-Z0-9-]{10,50}$/.test(body.attemptId)) {
      return NextResponse.json({ error: "attemptId required (10-50 chars, stable per button click)" }, { status: 400 });
    }
    if (body.niche !== undefined && typeof body.niche !== "string") {
      return NextResponse.json({ error: "Invalid video request" }, { status: 400 });
    }
    if (body.orientation !== undefined && body.orientation !== "vertical" && body.orientation !== "horizontal") {
      return NextResponse.json({ error: "Invalid video request" }, { status: 400 });
    }
    extra.idea = idea;
    extra.attempt_id = body.attemptId;
    extra.niche = (body.niche || "").trim().slice(0, 80);
    extra.orientation = body.orientation === "horizontal" ? "horizontal" : "vertical";
  }

  const origin = appBaseUrl(process.env, new URL(req.url).origin);
  if (!origin) return NextResponse.json({ error: CARD_NOT_CONFIGURED }, { status: 503 });

  try {
    const session = await createCheckoutSession(buildCheckoutParams({
      sku,
      priceId,
      email,
      origin,
      returnTo: sku.id === "contentbot.clip" ? "home" : returnTo,
      extraMetadata: extra,
    }));
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.warn(`pcb card checkout failed (${err instanceof Error ? err.message : "stripe"})`);
    return NextResponse.json({ error: "Card checkout could not start. You can pay with Ixis instead." }, { status: 502 });
  }
}

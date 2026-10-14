/**
 * ContentBot card checkout on the single Apixis Dev LLC Stripe account.
 *
 * Same shape as the other product sites: a price id per SKU from the environment (this file
 * never creates a Stripe product or price), Checkout Session metadata `product` / `sku` / `tier`,
 * no `payment_method_types` (Dashboard decides), and Stripe's own receipt email on the session.
 * Ixis charges stay on the Wallet and do not come through here.
 *
 * The card button and every card route stay off until CONTENTBOT_CARD_PAYMENTS is true AND
 * every SKU in lib/pricing.ts has its price id set.
 */
import type Stripe from "stripe";
import { PRICING_CATALOG, type PricingSKU } from "./pricing";

export const CARD_PRODUCT = "contentbot";
export const CARD_FLAG = "CONTENTBOT_CARD_PAYMENTS";

export const CARD_OFF_MESSAGE = "Card payments are not available.";
export const CARD_NOT_CONFIGURED = "Card checkout is not configured.";

export function priceEnvName(skuId: string): string {
  return "STRIPE_PRICE_" + skuId.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

export function priceIdForSku(skuId: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const value = env[priceEnvName(skuId)]?.trim();
  return value ? value : undefined;
}

export function cardFlagOn(env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = (env[CARD_FLAG] ?? "").trim().toLowerCase();
  return flag === "true" || flag === "1" || flag === "on";
}

/** Hidden until the flag is on and every catalog SKU has a Stripe price id. */
export function cardPaymentsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (!cardFlagOn(env)) return false;
  return PRICING_CATALOG.every((sku) => Boolean(priceIdForSku(sku.id, env)));
}

export function skuById(id: string): PricingSKU | undefined {
  return PRICING_CATALOG.find((sku) => sku.id === id);
}

export function checkoutMode(sku: PricingSKU): "payment" | "subscription" {
  return sku.type === "monthly-seat" ? "subscription" : "payment";
}

/** On the Checkout Session, the PaymentIntent, and the Subscription. Prices are pre-created and are not edited here. */
export function productMetadata(sku: PricingSKU, extra?: Record<string, string>): Record<string, string> {
  return {
    product: CARD_PRODUCT,
    sku: sku.id,
    tier: sku.type,
    ...extra,
  };
}

export function appBaseUrl(env: NodeJS.ProcessEnv = process.env, fallbackOrigin?: string): string {
  const raw = (env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_SITE_URL || fallbackOrigin || "").trim();
  return raw.replace(/\/$/, "");
}

export function buildCheckoutParams(input: {
  sku: PricingSKU;
  priceId: string;
  email: string;
  origin: string;
  returnTo: "home" | "billing" | "pricing";
  extraMetadata?: Record<string, string>;
}): Stripe.Checkout.SessionCreateParams {
  const metadata = productMetadata(input.sku, input.extraMetadata);
  const successPath = input.returnTo === "home" ? "/" : input.returnTo === "pricing" ? "/pricing" : "/billing";
  const origin = input.origin.replace(/\/$/, "");
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: checkoutMode(input.sku),
    customer_email: input.email,
    client_reference_id: input.email,
    metadata,
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: `${origin}${successPath}?card_session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${successPath}?card=cancelled`,
  };
  if (params.mode === "payment") {
    params.customer_creation = "always";
    params.payment_intent_data = { receipt_email: input.email, metadata };
    params.invoice_creation = { enabled: true };
  } else {
    params.subscription_data = { metadata, description: input.sku.name };
  }
  return params;
}

export type PaidClip = {
  sessionId: string;
  attemptId: string;
  idea: string;
  niche: string | null;
  orientation: "vertical" | "horizontal";
  paymentIntentId: string | null;
  amountCents: number | null;
  currency: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function paidClipFromSession(session: {
  id?: string;
  mode?: string;
  payment_status?: string;
  status?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  payment_intent?: string | { id?: string } | null;
  metadata?: Record<string, string> | null;
}, ownerEmail: string): PaidClip {
  const metadata = session.metadata ?? {};
  if (metadata.product !== CARD_PRODUCT || metadata.sku !== "contentbot.clip") {
    throw new Error("That card payment is not for a ContentBot clip.");
  }
  if (session.mode && session.mode !== "payment") {
    throw new Error("That card payment is not a one-time clip charge.");
  }
  const paid = session.payment_status === "paid" || session.status === "complete";
  if (!paid) throw new Error("The card payment is not complete.");
  if ((metadata.owner_email || "").toLowerCase() !== ownerEmail.toLowerCase()) {
    throw new Error("That card payment is not on your account.");
  }
  const idea = (metadata.idea || "").trim();
  if (idea.length < 3 || idea.length > 280) throw new Error("The clip idea on that payment is missing.");
  const attemptId = metadata.attempt_id || "";
  if (!/^[a-zA-Z0-9-]{10,50}$/.test(attemptId)) throw new Error("That card payment is missing its clip id.");
  const niche = (metadata.niche || "").trim();
  const orientation = metadata.orientation === "horizontal" ? "horizontal" : "vertical";
  const paymentIntent = session.payment_intent;
  const paymentIntentId = typeof paymentIntent === "string" ? paymentIntent : asString(paymentIntent?.id) || null;
  return {
    sessionId: session.id || "",
    attemptId,
    idea,
    niche: niche || null,
    orientation,
    paymentIntentId,
    amountCents: typeof session.amount_total === "number" ? session.amount_total : null,
    currency: session.currency || "usd",
  };
}

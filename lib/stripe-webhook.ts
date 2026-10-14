import Stripe from "stripe";
import { cardPaymentsEnabled } from "./stripe-checkout";
import { draftFromStripeEvent, insertCardPayment, type StripeEventLike } from "./payment-ledger";

export type WebhookResult = { status: number; body: Record<string, unknown> };

function stripeClient(key: string): Stripe {
  return new Stripe(key);
}

export async function renewsAtForSubscription(subscriptionId: string, key: string): Promise<string | null> {
  try {
    const stripe = stripeClient(key);
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const fromItem = sub.items?.data?.[0] && "current_period_end" in sub.items.data[0]
      ? (sub.items.data[0] as { current_period_end?: number }).current_period_end
      : undefined;
    const end = (sub as { current_period_end?: number }).current_period_end ?? fromItem;
    if (!end) return null;
    return new Date(end * 1000).toISOString();
  } catch (err) {
    console.warn(`pcb payments: renewal date unavailable (${err instanceof Error ? err.message : "stripe"})`);
    return null;
  }
}

export async function handleStripeWebhook(input: {
  payload: string;
  signature: string | null;
  env?: NodeJS.ProcessEnv;
  record?: typeof insertCardPayment;
  renewsAt?: (subscriptionId: string) => Promise<string | null>;
}): Promise<WebhookResult> {
  const env = input.env ?? process.env;
  const secret = (env.STRIPE_WEBHOOK_SECRET || "").trim();
  const key = (env.STRIPE_SECRET_KEY || "").trim();
  if (!secret || !key) return { status: 503, body: { error: "Stripe webhook is not configured." } };
  if (!input.signature) return { status: 400, body: { error: "Missing stripe-signature." } };

  let event: Stripe.Event;
  try {
    event = stripeClient(key).webhooks.constructEvent(input.payload, input.signature, secret);
  } catch {
    return { status: 400, body: { error: "Invalid webhook signature." } };
  }

  if (!cardPaymentsEnabled(env)) return { status: 200, body: { received: true, ignored: true } };

  const like = event as unknown as StripeEventLike;
  const subscriptionId = (() => {
    const object = like.data?.object ?? {};
    const raw = object.subscription;
    if (typeof raw === "string") return raw;
    if (raw && typeof raw === "object" && typeof (raw as { id?: unknown }).id === "string") return (raw as { id: string }).id;
    return null;
  })();
  const renews = subscriptionId && input.renewsAt
    ? await input.renewsAt(subscriptionId)
    : subscriptionId && key
      ? await renewsAtForSubscription(subscriptionId, key)
      : null;
  const draft = draftFromStripeEvent(like, renews);
  if (!draft) return { status: 200, body: { received: true, ignored: true } };

  const record = input.record ?? insertCardPayment;
  const saved = await record(draft);
  if (saved === "duplicate") return { status: 200, body: { received: true, duplicate: true } };
  if (saved === "unavailable") return { status: 200, body: { received: true, recorded: false } };
  return { status: 200, body: { received: true, recorded: true } };
}

import Stripe from "stripe";
import { CARD_NOT_CONFIGURED, paidClipFromSession, type PaidClip } from "./stripe-checkout";

export function stripeSecret(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const key = env.STRIPE_SECRET_KEY?.trim();
  return key || undefined;
}

export function getStripe(env: NodeJS.ProcessEnv = process.env): Stripe {
  const key = stripeSecret(env);
  if (!key) throw new Error(CARD_NOT_CONFIGURED);
  return new Stripe(key);
}

export async function createCheckoutSession(params: Stripe.Checkout.SessionCreateParams, env: NodeJS.ProcessEnv = process.env): Promise<{ url: string }> {
  const stripe = getStripe(env);
  const session = await stripe.checkout.sessions.create(params);
  if (!session.url) throw new Error(CARD_NOT_CONFIGURED);
  return { url: session.url };
}

export async function verifyPaidClip(sessionId: string, ownerEmail: string, env: NodeJS.ProcessEnv = process.env): Promise<PaidClip> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) throw new Error("That card payment could not be found.");
  const stripe = getStripe(env);
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const paid = paidClipFromSession(session, ownerEmail);
  if (!paid.sessionId) throw new Error("That card payment could not be found.");
  return paid;
}

export async function cancelSubscriptionAtPeriodEnd(subscriptionId: string, env: NodeJS.ProcessEnv = process.env): Promise<{ renewsAt: string | null }> {
  if (!/^sub_[A-Za-z0-9_]+$/.test(subscriptionId)) throw new Error("That subscription is not on your account.");
  const stripe = getStripe(env);
  const sub = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  const fromItem = sub.items?.data?.[0] && "current_period_end" in sub.items.data[0]
    ? (sub.items.data[0] as { current_period_end?: number }).current_period_end
    : undefined;
  const end = (sub as { current_period_end?: number }).current_period_end ?? fromItem;
  return { renewsAt: end ? new Date(end * 1000).toISOString() : null };
}

import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import Stripe from "stripe";
import { PRICING_CATALOG } from "@/lib/pricing";
import { priceEnvName } from "@/lib/stripe-checkout";
import { handleStripeWebhook } from "@/lib/stripe-webhook";
import type { LedgerDraft } from "@/lib/payment-ledger";

const SECRET = "whsec_test_secret";
const KEY = "sk_test_123";

function enabledEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: "test",
    CONTENTBOT_CARD_PAYMENTS: "true",
    STRIPE_WEBHOOK_SECRET: SECRET,
    STRIPE_SECRET_KEY: KEY,
  };
  for (const sku of PRICING_CATALOG) env[priceEnvName(sku.id)] = `price_${sku.id}`;
  return env;
}

function signed(payload: string, secret = SECRET): string {
  return new Stripe(KEY).webhooks.generateTestHeaderString({ payload, secret });
}

const clipEvent = {
  id: "evt_clip",
  object: "event",
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_test_abc",
      object: "checkout.session",
      payment_status: "paid",
      amount_total: 800,
      currency: "usd",
      payment_intent: "pi_abc",
      metadata: {
        product: "contentbot",
        sku: "contentbot.clip",
        tier: "per-job",
        owner_email: "a@b.co",
      },
    },
  },
};

describe("stripe webhook", () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("rejects a missing or bad signature", async () => {
    const payload = JSON.stringify(clipEvent);
    const missing = await handleStripeWebhook({ payload, signature: null, env: enabledEnv(), renewsAt: async () => null });
    expect(missing.status).toBe(400);

    const bad = await handleStripeWebhook({
      payload,
      signature: signed(payload, "whsec_wrong"),
      env: enabledEnv(),
      renewsAt: async () => null,
    });
    expect(bad.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("does not record while card payments are off", async () => {
    const payload = JSON.stringify(clipEvent);
    const record = jest.fn(async () => "inserted" as const);
    const env = enabledEnv();
    env.CONTENTBOT_CARD_PAYMENTS = "";
    const result = await handleStripeWebhook({
      payload,
      signature: signed(payload),
      env,
      record,
      renewsAt: async () => null,
    });
    expect(result).toEqual({ status: 200, body: { received: true, ignored: true } });
    expect(record).not.toHaveBeenCalled();
  });

  it("records a signed completed checkout once", async () => {
    const payload = JSON.stringify(clipEvent);
    const seen: LedgerDraft[] = [];
    const record = jest.fn(async (row: LedgerDraft) => {
      seen.push(row);
      return "inserted" as const;
    });
    const result = await handleStripeWebhook({
      payload,
      signature: signed(payload),
      env: enabledEnv(),
      record,
      renewsAt: async () => null,
    });
    expect(result.status).toBe(200);
    expect(result.body.recorded).toBe(true);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ sku: "contentbot.clip", owner_email: "a@b.co", stripe_event_id: "evt_clip" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("acks a duplicate payment without failing the webhook", async () => {
    const payload = JSON.stringify(clipEvent);
    const record = jest.fn(async () => "duplicate" as const);
    const result = await handleStripeWebhook({
      payload,
      signature: signed(payload),
      env: enabledEnv(),
      record,
      renewsAt: async () => null,
    });
    expect(result).toEqual({ status: 200, body: { received: true, duplicate: true } });
  });
});

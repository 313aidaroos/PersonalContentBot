import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { PRICING_CATALOG } from "@/lib/pricing";
import {
  buildCheckoutParams,
  cardPaymentsEnabled,
  paidClipFromSession,
  priceEnvName,
  skuById,
} from "@/lib/stripe-checkout";
import { draftFromStripeEvent, ledgerUnavailable } from "@/lib/payment-ledger";

function envWithPrices(flag: string | undefined, omit?: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { NODE_ENV: "test" };
  if (flag !== undefined) env.CONTENTBOT_CARD_PAYMENTS = flag;
  for (const sku of PRICING_CATALOG) {
    if (sku.id === omit) continue;
    env[priceEnvName(sku.id)] = `price_test_${sku.id.replace(/[^a-z0-9]+/gi, "_")}`;
  }
  return env;
}

describe("card payment gating", () => {
  it("names one Stripe price env var per catalog SKU", () => {
    expect(priceEnvName("contentbot.clip")).toBe("STRIPE_PRICE_CONTENTBOT_CLIP");
    expect(priceEnvName("contentbot.text")).toBe("STRIPE_PRICE_CONTENTBOT_TEXT");
    expect(priceEnvName("contentbot.image")).toBe("STRIPE_PRICE_CONTENTBOT_IMAGE");
    expect(priceEnvName("contentbot.adset")).toBe("STRIPE_PRICE_CONTENTBOT_ADSET");
    expect(priceEnvName("contentbot.creator.monthly")).toBe("STRIPE_PRICE_CONTENTBOT_CREATOR_MONTHLY");
    expect(priceEnvName("apixis.file.unit")).toBe("STRIPE_PRICE_APIXIS_FILE_UNIT");
    expect(PRICING_CATALOG).toHaveLength(6);
  });

  it("stays off until the flag is set and every price id exists", () => {
    expect(cardPaymentsEnabled(envWithPrices(undefined))).toBe(false);
    expect(cardPaymentsEnabled(envWithPrices(""))).toBe(false);
    expect(cardPaymentsEnabled(envWithPrices("false"))).toBe(false);
    expect(cardPaymentsEnabled(envWithPrices("true", "contentbot.image"))).toBe(false);
    const blank = envWithPrices("true");
    blank.STRIPE_PRICE_CONTENTBOT_CLIP = "   ";
    expect(cardPaymentsEnabled(blank)).toBe(false);
    expect(cardPaymentsEnabled(envWithPrices("true"))).toBe(true);
    expect(cardPaymentsEnabled(envWithPrices("on"))).toBe(true);
  });

  it("puts product metadata on the session and asks Stripe to email the receipt", () => {
    const clip = skuById("contentbot.clip")!;
    const seat = skuById("contentbot.creator.monthly")!;
    const payment = buildCheckoutParams({
      sku: clip,
      priceId: "price_clip",
      email: "a@b.co",
      origin: "https://personalcontentbot.vercel.app",
      returnTo: "home",
      extraMetadata: { owner_email: "a@b.co", idea: "cold brew", attempt_id: "attempt-000001" },
    });
    expect(payment.mode).toBe("payment");
    expect(payment.metadata).toMatchObject({ product: "contentbot", sku: "contentbot.clip", tier: "per-job" });
    expect(payment.payment_intent_data?.metadata).toMatchObject({ product: "contentbot", sku: "contentbot.clip" });
    expect(payment.payment_intent_data?.receipt_email).toBe("a@b.co");
    expect(payment.invoice_creation).toEqual({ enabled: true });
    expect(payment.line_items).toEqual([{ price: "price_clip", quantity: 1 }]);
    expect(payment).not.toHaveProperty("payment_method_types");
    expect(payment.success_url).toContain("/?card_session=");

    const subscription = buildCheckoutParams({
      sku: seat,
      priceId: "price_seat",
      email: "a@b.co",
      origin: "https://personalcontentbot.vercel.app/",
      returnTo: "billing",
      extraMetadata: { owner_email: "a@b.co" },
    });
    expect(subscription.mode).toBe("subscription");
    expect(subscription.subscription_data?.metadata).toMatchObject({
      product: "contentbot",
      sku: "contentbot.creator.monthly",
      tier: "monthly-seat",
    });
    expect(subscription.customer_email).toBe("a@b.co");
    expect(subscription.success_url).toBe("https://personalcontentbot.vercel.app/billing?card_session={CHECKOUT_SESSION_ID}");
  });

  it("accepts a paid clip session for the same account only", () => {
    const session = {
      id: "cs_test_123",
      mode: "payment",
      payment_status: "paid",
      amount_total: 800,
      currency: "usd",
      payment_intent: "pi_123",
      metadata: {
        product: "contentbot",
        sku: "contentbot.clip",
        tier: "per-job",
        owner_email: "owner@example.com",
        idea: "three hooks for cold brew",
        niche: "coffee",
        orientation: "vertical",
        attempt_id: "attempt-card-01",
      },
    };
    expect(paidClipFromSession(session, "Owner@Example.com").idea).toBe("three hooks for cold brew");
    expect(() => paidClipFromSession(session, "other@example.com")).toThrow(/not on your account/);
    expect(() => paidClipFromSession({ ...session, payment_status: "unpaid", status: "open" }, "owner@example.com")).toThrow(/not complete/);
    expect(() => paidClipFromSession({ ...session, metadata: { ...session.metadata, product: "other" } }, "owner@example.com")).toThrow(/not for a ContentBot clip/);
  });
});

describe("completed card payments", () => {
  it("records a ContentBot checkout and ignores everything else", () => {
    const paid = draftFromStripeEvent({
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          payment_status: "paid",
          amount_total: 800,
          currency: "usd",
          payment_intent: "pi_123",
          metadata: { product: "contentbot", sku: "contentbot.clip", tier: "per-job", owner_email: "A@B.co" },
        },
      },
    });
    expect(paid).toMatchObject({
      owner_email: "a@b.co",
      sku: "contentbot.clip",
      amount_cents: 800,
      amount_ixis: 800,
      stripe_checkout_session_id: "cs_test_123",
      stripe_event_id: "evt_1",
      status: "paid",
    });

    expect(draftFromStripeEvent({
      id: "evt_2",
      type: "checkout.session.completed",
      data: { object: { payment_status: "paid", metadata: { product: "wallet", sku: "spark" } } },
    })).toBeNull();
    expect(draftFromStripeEvent({
      id: "evt_3",
      type: "customer.created",
      data: { object: { metadata: { product: "contentbot", sku: "contentbot.clip" } } },
    })).toBeNull();
  });

  it("treats a missing payments table as unavailable", () => {
    expect(ledgerUnavailable(404, "not found")).toBe(true);
    expect(ledgerUnavailable(400, 'relation "public.pcb_payments" does not exist')).toBe(true);
    expect(ledgerUnavailable(400, "Could not find the table in the schema cache")).toBe(true);
    expect(ledgerUnavailable(500, "timeout")).toBe(false);
  });

  it("ships the ledger as a SQL file with RLS and does not apply it", () => {
    const sql = readFileSync("supabase/migrations/20261014_pcb_payments.sql", "utf8");
    expect(sql).toMatch(/create table if not exists public\.pcb_payments/i);
    expect(sql).toMatch(/enable row level security/i);
    expect(sql).toMatch(/FILE ONLY/i);
    expect(sql).not.toMatch(/drop database/i);
  });
});

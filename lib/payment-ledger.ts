/**
 * Card payment ledger. Reads and writes go through the service role only.
 * If the table from supabase/migrations/20261014_pcb_payments.sql is not there yet,
 * every call returns available: false and the Billing page keeps working.
 * This module never applies that SQL.
 */
import { skuById } from "./stripe-checkout";

export type LedgerRow = {
  id: string;
  owner_email: string;
  method: "card" | "ixis";
  sku: string;
  description: string;
  amount_cents: number | null;
  amount_ixis: number | null;
  currency: string;
  status: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_subscription_id: string | null;
  stripe_event_id: string | null;
  renews_at: string | null;
  cancel_at_period_end: boolean;
  job_id: string | null;
  created_at: string;
};

export type LedgerDraft = {
  owner_email: string;
  method: "card";
  sku: string;
  description: string;
  amount_cents: number | null;
  amount_ixis: number | null;
  currency: string;
  status: "paid";
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_subscription_id: string | null;
  stripe_event_id: string;
  renews_at: string | null;
};

const TABLE = "pcb_payments";

function serviceEnv(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();
  if (!url || !key) return null;
  return { url, key };
}

function headers(key: string, prefer?: string): Record<string, string> {
  const h: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (prefer) h.Prefer = prefer;
  return h;
}

export function ledgerUnavailable(status: number, body: string): boolean {
  if (status === 404) return true;
  return /pcb_payments|schema cache|does not exist|PGRST205|42P01/i.test(body);
}

async function rest(path: string, init: RequestInit): Promise<{ ok: true; status: number; text: string } | { ok: false; unavailable: true } | { ok: false; status: number; text: string }> {
  const env = serviceEnv();
  if (!env) return { ok: false, unavailable: true };
  try {
    const res = await fetch(`${env.url}/rest/v1/${path}`, { ...init, cache: "no-store" });
    const text = await res.text();
    if (ledgerUnavailable(res.status, text)) return { ok: false, unavailable: true };
    if (!res.ok) return { ok: false, status: res.status, text };
    return { ok: true, status: res.status, text };
  } catch (err) {
    console.warn(`pcb payments: ledger request failed (${err instanceof Error ? err.message : "network"})`);
    return { ok: false, unavailable: true };
  }
}

export async function insertCardPayment(draft: LedgerDraft): Promise<"inserted" | "duplicate" | "unavailable"> {
  const env = serviceEnv();
  if (!env) return "unavailable";
  const result = await rest(TABLE, {
    method: "POST",
    headers: headers(env.key, "return=minimal"),
    body: JSON.stringify({
      ...draft,
      owner_email: draft.owner_email.toLowerCase(),
      cancel_at_period_end: false,
    }),
  });
  if ("unavailable" in result) return "unavailable";
  if (result.ok) return "inserted";
  if (result.status === 409 || /23505|duplicate/i.test(result.text)) return "duplicate";
  console.warn(`pcb payments: could not record card payment (${result.status})`);
  return "unavailable";
}

export async function listCardPayments(ownerEmail: string): Promise<{ available: boolean; rows: LedgerRow[] }> {
  const env = serviceEnv();
  if (!env) return { available: false, rows: [] };
  const owner = encodeURIComponent(ownerEmail.toLowerCase());
  const result = await rest(
    `${TABLE}?owner_email=eq.${owner}&select=*&order=created_at.desc&limit=50`,
    { headers: headers(env.key) },
  );
  if ("unavailable" in result || !result.ok) return { available: false, rows: [] };
  try {
    const rows = result.text ? (JSON.parse(result.text) as LedgerRow[]) : [];
    return { available: true, rows: Array.isArray(rows) ? rows : [] };
  } catch {
    return { available: false, rows: [] };
  }
}

export async function markSubscriptionCancelling(ownerEmail: string, subscriptionId: string): Promise<"updated" | "missing" | "unavailable"> {
  const env = serviceEnv();
  if (!env) return "unavailable";
  const owner = encodeURIComponent(ownerEmail.toLowerCase());
  const sub = encodeURIComponent(subscriptionId);
  const result = await rest(
    `${TABLE}?owner_email=eq.${owner}&stripe_subscription_id=eq.${sub}`,
    {
      method: "PATCH",
      headers: headers(env.key, "return=representation"),
      body: JSON.stringify({ cancel_at_period_end: true }),
    },
  );
  if ("unavailable" in result) return "unavailable";
  if (!result.ok) return "unavailable";
  try {
    const rows = result.text ? (JSON.parse(result.text) as unknown[]) : [];
    return Array.isArray(rows) && rows.length > 0 ? "updated" : "missing";
  } catch {
    return "unavailable";
  }
}

export function describeSku(sku: string): string {
  return skuById(sku)?.name || sku;
}

export type StripeEventLike = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

function metaOf(object: Record<string, unknown>): Record<string, string> {
  const direct = object.metadata;
  const bag: Record<string, string> = {};
  const take = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (typeof item === "string" && item && !bag[key]) bag[key] = item;
    }
  };
  take(direct);
  const parent = object.parent;
  if (parent && typeof parent === "object") {
    const details = (parent as { subscription_details?: { metadata?: unknown } }).subscription_details;
    take(details?.metadata);
  }
  const subDetails = object.subscription_details;
  if (subDetails && typeof subDetails === "object") take((subDetails as { metadata?: unknown }).metadata);
  const lines = object.lines;
  if (lines && typeof lines === "object") {
    const data = (lines as { data?: Array<{ metadata?: unknown }> }).data;
    if (Array.isArray(data)) for (const line of data) take(line.metadata);
  }
  return bag;
}

function idOf(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return null;
}

/** Map a verified Stripe event into one ledger row. Null means this event is not a ContentBot charge. */
export function draftFromStripeEvent(event: StripeEventLike, renewsAt: string | null = null): LedgerDraft | null {
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded" && event.type !== "invoice.paid") {
    return null;
  }
  const object = event.data?.object ?? {};
  const metadata = metaOf(object);
  if (metadata.product !== "contentbot" || !metadata.sku) return null;
  const owner = (metadata.owner_email || (typeof object.customer_email === "string" ? object.customer_email : "")).trim().toLowerCase();
  if (!owner) return null;

  if (event.type === "invoice.paid") {
    const status = typeof object.status === "string" ? object.status : "";
    if (status && status !== "paid") return null;
    const amount = typeof object.amount_paid === "number" ? object.amount_paid : null;
    return {
      owner_email: owner,
      method: "card",
      sku: metadata.sku,
      description: describeSku(metadata.sku),
      amount_cents: amount,
      amount_ixis: skuById(metadata.sku)?.ixis ?? null,
      currency: typeof object.currency === "string" ? object.currency : "usd",
      status: "paid",
      stripe_checkout_session_id: null,
      stripe_payment_intent_id: idOf(object.payment_intent),
      stripe_subscription_id: idOf(object.subscription),
      stripe_event_id: event.id,
      renews_at: renewsAt,
    };
  }

  const paymentStatus = typeof object.payment_status === "string" ? object.payment_status : "";
  const sessionStatus = typeof object.status === "string" ? object.status : "";
  if (paymentStatus !== "paid" && sessionStatus !== "complete") return null;
  return {
    owner_email: owner,
    method: "card",
    sku: metadata.sku,
    description: describeSku(metadata.sku),
    amount_cents: typeof object.amount_total === "number" ? object.amount_total : null,
    amount_ixis: skuById(metadata.sku)?.ixis ?? null,
    currency: typeof object.currency === "string" ? object.currency : "usd",
    status: "paid",
    stripe_checkout_session_id: typeof object.id === "string" ? object.id : null,
    stripe_payment_intent_id: idOf(object.payment_intent),
    stripe_subscription_id: idOf(object.subscription),
    stripe_event_id: event.id,
    renews_at: renewsAt,
  };
}

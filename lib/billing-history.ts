import { walletBalance } from "./apixis-wallet";
import { apixisOwner } from "./apixis-login";
import { formatIxis, formatUsd, IXIS_TO_USD } from "./pricing";
import { describeSku, listCardPayments, type LedgerRow } from "./payment-ledger";
import { cardPaymentsEnabled, skuById } from "./stripe-checkout";

export type BillingEntry = {
  id: string;
  at: string;
  amount: string;
  detail: string;
  description: string;
  method: "card" | "ixis";
  renewsAt: string | null;
  subscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
};

export type BillingHistory = {
  cardEnabled: boolean;
  cardLedger: boolean;
  ixisLedger: boolean;
  entries: BillingEntry[];
};

function cardAmount(row: LedgerRow): string {
  if (typeof row.amount_cents === "number") return formatUsd(row.amount_cents / 100);
  if (typeof row.amount_ixis === "number") return formatIxis(row.amount_ixis);
  return "Card";
}

function fromCard(row: LedgerRow): BillingEntry {
  const sku = skuById(row.sku);
  const ixis = typeof row.amount_ixis === "number" ? row.amount_ixis : sku?.ixis;
  return {
    id: `card-${row.id}`,
    at: row.created_at,
    amount: cardAmount(row),
    detail: typeof ixis === "number" ? formatIxis(ixis) : "Card",
    description: row.description || describeSku(row.sku),
    method: "card",
    renewsAt: row.renews_at,
    subscriptionId: row.stripe_subscription_id,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
  };
}

export async function loadBillingHistory(email: string): Promise<BillingHistory> {
  const card = await listCardPayments(email);
  const entries: BillingEntry[] = card.rows
    .filter((row) => row.status === "paid" || row.status === "refunded")
    .map(fromCard);

  let ixisLedger = false;
  try {
    const owner = (await apixisOwner(email)) ?? email;
    const balance = await walletBalance(owner, { history: 50 });
    ixisLedger = true;
    for (const item of balance.history) {
      if (item.kind !== "spend") continue;
      const sku = item.productKey ? skuById(item.productKey) : undefined;
      const ixis = Math.abs(item.amount);
      entries.push({
        id: `ixis-${item.id}`,
        at: item.createdAt,
        amount: formatIxis(ixis),
        detail: formatUsd(ixis / IXIS_TO_USD),
        description: sku?.name || item.description || item.productKey || "Ixis payment",
        method: "ixis",
        renewsAt: null,
        subscriptionId: null,
        cancelAtPeriodEnd: false,
      });
    }
  } catch (err) {
    console.warn(`pcb billing: Ixis history unavailable (${err instanceof Error ? err.message : "wallet"})`);
  }

  entries.sort((a, b) => b.at.localeCompare(a.at));
  return {
    cardEnabled: cardPaymentsEnabled(),
    cardLedger: card.available,
    ixisLedger,
    entries,
  };
}

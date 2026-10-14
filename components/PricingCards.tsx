"use client";

import { useState } from "react";
import { PRICING_CATALOG, formatIxis, formatUsd, type PricingSKU } from "@/lib/pricing";
import { ApixisWalletChip } from "@/components/ApixisWalletChip";

function CardPay({ sku }: { sku: PricingSKU }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    if (sku.id === "contentbot.clip") {
      window.location.href = "/?pay=card";
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku: sku.id, returnTo: "billing" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/auth?next=${encodeURIComponent("/pricing")}`;
        return;
      }
      if (!res.ok || typeof data.url !== "string") {
        throw new Error(typeof data.error === "string" ? data.error : "Card checkout could not start.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Card checkout could not start.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        style={{ marginTop: 8, width: "100%", background: "var(--card)", color: "var(--ink)", border: "1px solid var(--line)" }}
      >
        {busy ? "Opening card checkout…" : `Pay by card · ${formatUsd(sku.usd)}`}
      </button>
      {error ? <div className="err">{error}</div> : null}
    </div>
  );
}

export function PricingCards({ cardEnabled }: { cardEnabled: boolean }) {
  const perJobItems = PRICING_CATALOG.filter((s) => s.type === "per-job");
  const seats = PRICING_CATALOG.filter((s) => s.type === "monthly-seat");
  const oneOffs = PRICING_CATALOG.filter((s) => s.type === "one-off");

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <h1>Pricing</h1>
          <p>Your Apixis Wallet: <ApixisWalletChip /></p>
          <p>
            Pay with Ixis. 100 Ixis = $1. Paid Ixis never expires.
            {" "}
            <a href="/billing" style={{ color: "var(--accent)" }}>Billing</a>
          </p>
        </div>
      </header>

      <section className="card" style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "18px", margin: "0 0 12px" }}>Monthly Creator Seat</h2>
        {seats.map((sku) => (
          <div key={sku.id} style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div>
                <strong>{sku.name}</strong>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "13px" }}>
                  {sku.description}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "18px", fontWeight: "600" }}>{formatIxis(sku.ixis)}</div>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>{formatUsd(sku.usd)}/mo</div>
              </div>
            </div>
            <button
              style={{ marginTop: "12px", width: "100%" }}
              onClick={() => {
                window.location.href = `https://apixis-wallet.vercel.app/buy?product=contentbot&return_url=${encodeURIComponent(window.location.href)}`;
              }}
            >
              Buy Ixis · {formatIxis(sku.ixis)}
            </button>
            {cardEnabled ? <CardPay sku={sku} /> : null}
          </div>
        ))}
      </section>

      <section className="card" style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "18px", margin: "0 0 12px" }}>Per-Job Pricing</h2>
        <div style={{ display: "grid", gap: "12px" }}>
          {perJobItems.map((sku) => (
            <div
              key={sku.id}
              style={{
                padding: "12px",
                border: "1px solid var(--line)",
                borderRadius: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ fontSize: "14px" }}>{sku.name}</strong>
                  <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "12px" }}>
                    {sku.description}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "14px" }}>{formatIxis(sku.ixis)}</div>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>{formatUsd(sku.usd)}</div>
                </div>
              </div>
              {cardEnabled ? <CardPay sku={sku} /> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 style={{ fontSize: "18px", margin: "0 0 12px" }}>One-Off Add-Ons</h2>
        <div style={{ display: "grid", gap: "12px" }}>
          {oneOffs.map((sku) => (
            <div
              key={sku.id}
              style={{
                padding: "12px",
                border: "1px solid var(--line)",
                borderRadius: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ fontSize: "14px" }}>{sku.name}</strong>
                  <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "12px" }}>
                    {sku.description}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "14px" }}>{formatIxis(sku.ixis)}</div>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>{formatUsd(sku.usd)}</div>
                </div>
              </div>
              {cardEnabled ? <CardPay sku={sku} /> : null}
            </div>
          ))}
        </div>
      </section>

      <div style={{ marginTop: "24px", padding: "16px", background: "var(--card)", borderRadius: "12px", border: "1px solid var(--line)" }}>
        <p style={{ margin: "0", fontSize: "13px", color: "var(--muted)" }}>
          <strong style={{ color: "var(--ink)" }}>How to buy Ixis:</strong> Visit{" "}
          <a href="https://apixis-wallet.vercel.app" style={{ color: "var(--accent)" }}>
            Apixis Wallet
          </a>{" "}
          to purchase Ixis. 100 Ixis = $1. Paid Ixis never expires.
          {cardEnabled ? " Card checkout uses the same prices (100 Ixis = $1) and emails Stripe's own receipt." : ""}
        </p>
      </div>
    </main>
  );
}

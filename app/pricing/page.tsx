"use client";

import { PRICING_CATALOG, formatIxis, formatUsd } from "@/lib/pricing";

export default function PricingPage() {
  const perJobItems = PRICING_CATALOG.filter((s) => s.type === "per-job");
  const seats = PRICING_CATALOG.filter((s) => s.type === "monthly-seat");
  const oneOffs = PRICING_CATALOG.filter((s) => s.type === "one-off");

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <h1>Pricing</h1>
          <p>Pay with Ixis. 100 Ixis = $1. Paid Ixis never expires.</p>
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
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px",
                border: "1px solid var(--line)",
                borderRadius: "12px",
              }}
            >
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
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px",
                border: "1px solid var(--line)",
                borderRadius: "12px",
              }}
            >
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
          ))}
        </div>
      </section>

      <div style={{ marginTop: "24px", padding: "16px", background: "var(--card)", borderRadius: "12px", border: "1px solid var(--line)" }}>
        <p style={{ margin: "0", fontSize: "13px", color: "var(--muted)" }}>
          <strong style={{ color: "var(--ink)" }}>How to buy Ixis:</strong> Visit{" "}
          <a href="https://apixiswallet.vercel.app" style={{ color: "var(--accent)" }}>
            Apixis Wallet
          </a>{" "}
          to purchase Ixis. 100 Ixis = $1. Paid Ixis never expires.
        </p>
      </div>
    </main>
  );
}

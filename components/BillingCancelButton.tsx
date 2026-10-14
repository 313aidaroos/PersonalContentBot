"use client";

import { useState } from "react";

export function BillingCancelButton({ subscriptionId, pending }: { subscriptionId: string; pending: boolean }) {
  const [state, setState] = useState<"ready" | "working" | "done" | "error">(pending ? "done" : "ready");
  const [message, setMessage] = useState<string | null>(null);

  async function cancel() {
    setState("working");
    setMessage(null);
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setMessage(typeof data.error === "string" ? data.error : "The subscription could not be cancelled.");
        return;
      }
      setState("done");
    } catch {
      setState("error");
      setMessage("The subscription could not be cancelled.");
    }
  }

  if (state === "done") return <span style={{ color: "var(--muted)", fontSize: 12 }}>Cancels at period end</span>;

  return (
    <span>
      <button type="button" onClick={cancel} disabled={state === "working"} style={{ marginTop: 0, padding: "6px 12px" }}>
        {state === "working" ? "Cancelling…" : "Cancel"}
      </button>
      {message ? <span className="err" style={{ display: "block" }}>{message}</span> : null}
    </span>
  );
}

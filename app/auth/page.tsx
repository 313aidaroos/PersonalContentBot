"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await res.json()) as { message?: string; error?: string; token?: string };
      if (!res.ok) throw new Error(data.error || "Failed to send link");

      setSubmitted(true);
      // In dev, log the token for testing
      if (data.token) {
        console.log(`[DEV] Magic token: ${data.token}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error sending magic link");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <main className="wrap">
        <section className="card" style={{ maxWidth: "500px", margin: "100px auto" }}>
          <h2>Check your email</h2>
          <p>We sent a magic link to <strong>{email}</strong></p>
          <p>Click the link to log in. It expires in 15 minutes.</p>
          <button onClick={() => { setSubmitted(false); setEmail(""); }}>
            Send to a different email
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="wrap">
      <section className="card" style={{ maxWidth: "500px", margin: "100px auto" }}>
        <h2>Login with Magic Link</h2>
        <p>Enter your email to sign in. No password needed.</p>
        <form onSubmit={onSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send Magic Link"}
          </button>
          {error ? <div className="err">{error}</div> : null}
        </form>
      </section>
    </main>
  );
}

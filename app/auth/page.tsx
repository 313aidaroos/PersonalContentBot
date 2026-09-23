"use client";

import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { magicLink, passwordLogin } from "./actions";

function AuthForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  
  const [tab, setTab] = useState<"magic" | "password">("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleMagicLink(form: FormData) {
    startTransition(async () => {
      const result = await magicLink(form);
      if (result?.message) setMessage(result.message);
    });
  }

  function handlePasswordLogin(form: FormData) {
    startTransition(async () => {
      const result = await passwordLogin(form);
      if (result?.message) setMessage(result.message);
    });
  }

  return (
    <section className="card" style={{ maxWidth: "500px", margin: "100px auto" }}>
      <h2>Sign In</h2>
      
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "1px solid var(--line)" }}>
        <button
          type="button"
          onClick={() => { setTab("magic"); setMessage(null); }}
          style={{
            background: tab === "magic" ? "var(--card)" : "transparent",
            border: "none",
            borderBottom: tab === "magic" ? "2px solid var(--accent)" : "none",
            padding: "12px 16px",
            cursor: "pointer",
            fontWeight: tab === "magic" ? "600" : "normal",
          }}
        >
          Email me a link
        </button>
        <button
          type="button"
          onClick={() => { setTab("password"); setMessage(null); }}
          style={{
            background: tab === "password" ? "var(--card)" : "transparent",
            border: "none",
            borderBottom: tab === "password" ? "2px solid var(--accent)" : "none",
            padding: "12px 16px",
            cursor: "pointer",
            fontWeight: tab === "password" ? "600" : "normal",
          }}
        >
          Password
        </button>
      </div>

      {tab === "magic" ? (
        <form action={handleMagicLink}>
          <input type="hidden" name="next" value={next} />
          <label htmlFor="magic-email">Email</label>
          <input
            id="magic-email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" disabled={isPending}>
            {isPending ? "Sending…" : "Send Sign-In Link"}
          </button>
          <p style={{ margin: "12px 0 0", fontSize: "13px", color: "var(--muted)" }}>
            No password needed. We'll email you a link to sign in.
          </p>
        </form>
      ) : (
        <form action={handlePasswordLogin}>
          <input type="hidden" name="next" value={next} />
          <label htmlFor="password-email">Email</label>
          <input
            id="password-email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" disabled={isPending}>
            {isPending ? "Signing in…" : "Sign In"}
          </button>
          <p style={{ margin: "12px 0 0", fontSize: "13px", color: "var(--muted)" }}>
            Don't have a password? Use "Email me a link" instead.
          </p>
        </form>
      )}

      {message ? (
        <div style={{ 
          marginTop: "16px", 
          padding: "12px", 
          background: "var(--card)", 
          border: "1px solid var(--line)",
          borderRadius: "8px",
          fontSize: "14px"
        }}>
          {message}
        </div>
      ) : null}
    </section>
  );
}

export default function AuthPage() {
  return (
    <main className="wrap">
      <Suspense fallback={
        <section className="card" style={{ maxWidth: "500px", margin: "100px auto" }}>
          <h2>Loading...</h2>
        </section>
      }>
        <AuthForm />
      </Suspense>
    </main>
  );
}

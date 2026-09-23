"use client";

import { Suspense, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { setPassword } from "../auth/actions";

function SetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const next = searchParams.get("next") || "/";
  
  const [password, setPasswordValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(form: FormData) {
    if (password !== confirm) {
      setMessage("Passwords don't match");
      return;
    }
    
    startTransition(async () => {
      const result = await setPassword(form);
      if (result?.message) setMessage(result.message);
    });
  }

  function handleSkip() {
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
    router.push(safeNext);
  }

  return (
    <section className="card" style={{ maxWidth: "500px", margin: "100px auto" }}>
      <h2>Choose a Password</h2>
      <p style={{ marginBottom: "24px", color: "var(--muted)" }}>
        Next time you sign in without waiting for an email.
      </p>

      <form action={handleSubmit}>
        <input type="hidden" name="next" value={next} />
        
        <label htmlFor="password">Password (8+ characters)</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPasswordValue(e.target.value)}
        />
        
        <label htmlFor="confirm">Confirm Password</label>
        <input
          id="confirm"
          type="password"
          required
          minLength={8}
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        
        <button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save Password"}
        </button>
        
        <button
          type="button"
          onClick={handleSkip}
          style={{ 
            marginTop: "12px", 
            background: "transparent", 
            color: "var(--muted)",
            border: "1px solid var(--line)"
          }}
        >
          Skip for now →
        </button>
      </form>

      {message ? (
        <div style={{ 
          marginTop: "16px", 
          padding: "12px", 
          background: "var(--card)", 
          border: "1px solid var(--line)",
          borderRadius: "8px",
          fontSize: "14px",
          color: message.includes("at least") ? "var(--danger)" : "var(--ink)"
        }}>
          {message}
        </div>
      ) : null}
    </section>
  );
}

export default function SetPasswordPage() {
  return (
    <main className="wrap">
      <Suspense fallback={
        <section className="card" style={{ maxWidth: "500px", margin: "100px auto" }}>
          <h2>Loading...</h2>
        </section>
      }>
        <SetPasswordForm />
      </Suspense>
    </main>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Job } from "@/lib/types";
import CixyChatWidget from "@/components/CixyChatWidget";
import { formatUsd } from "@/lib/pricing";

export default function HomePage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [idea, setIdea] = useState("");
  const [niche, setNiche] = useState("");
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [cardEnabled, setCardEnabled] = useState(false);

  async function refresh() {
    const res = await fetch("/api/jobs", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load jobs");
    setJobs(data.jobs);
  }

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        
        if (!data.user) {
          const currentPath = window.location.pathname + window.location.search;
          router.push(`/auth?next=${encodeURIComponent(currentPath)}`);
          return;
        }
        
        setAuthed(true);
        refresh().catch((e) => setError(e.message));
        fetch("/api/stripe/checkout", { cache: "no-store" })
          .then((r) => r.json())
          .then((body) => setCardEnabled(Boolean(body.enabled)))
          .catch(() => setCardEnabled(false));
      } catch (err) {
        router.push("/auth");
      }
    }
    
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!authed) return;
    const sessionId = new URLSearchParams(window.location.search).get("card_session");
    if (!sessionId) return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment: "card", checkoutSessionId: sessionId }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "The clip could not be started.");
        window.history.replaceState({}, "", "/");
        window.location.href = `/jobs/${data.job.id}`;
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "The clip could not be started.");
        setBusy(false);
      });
    return () => { cancelled = true; };
  }, [authed]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const attemptId = `${Date.now()}-${Math.random().toString(36).slice(2, 15)}`;
      
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, niche, orientation, attemptId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          throw new Error(data.error || "Not enough Ixis");
        }
        throw new Error(data.error || "Queue failed");
      }
      setIdea("");
      await refresh();
      window.location.href = `/jobs/${data.job.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function payByCard() {
    setBusy(true);
    setError(null);
    try {
      const attemptId = `${Date.now()}-${Math.random().toString(36).slice(2, 15)}`;
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku: "contentbot.clip", returnTo: "home", idea, niche, orientation, attemptId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.push("/auth?next=/");
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

  if (!authed) return null;

  const wantCard = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("pay") === "card";

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <h1>PersonalContentBot</h1>
          <p>One-minute social videos. 800 Ixis · $8 per clip. <a href="/pricing" style={{ color: "var(--accent)" }}>See pricing</a></p>
        </div>
        <div style={{ display: "flex", gap: "8px", position: "absolute", top: "20px", right: "20px" }}>
          <button 
            onClick={() => router.push("/billing")}
            style={{ padding: "8px 16px", background: "var(--card)", color: "var(--ink)" }}
          >
            Billing
          </button>
          <button 
            onClick={() => router.push("/pricing")}
            style={{ padding: "8px 16px", background: "var(--card)", color: "var(--ink)" }}
          >
            Pricing
          </button>
          <button 
            onClick={async () => { 
              await fetch("/api/auth/session", { method: "DELETE" });
              router.push("/auth");
            }}
            style={{ padding: "8px 16px" }}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="grid">
        <form className="card" onSubmit={onSubmit}>
          <label htmlFor="idea">Idea</label>
          <textarea
            id="idea"
            required
            minLength={3}
            maxLength={280}
            placeholder="A 60s hook on why cold brew tastes flatter on camera than in the cup"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
          />
          <label htmlFor="niche">Niche (optional)</label>
          <input
            id="niche"
            maxLength={80}
            placeholder="specialty coffee"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
          />
          <label htmlFor="orientation">Frame</label>
          <select
            id="orientation"
            value={orientation}
            onChange={(e) => setOrientation(e.target.value as "vertical" | "horizontal")}
          >
            <option value="vertical">9:16 Reels / Shorts / TikTok</option>
            <option value="horizontal">16:9 YouTube</option>
          </select>
          <button type="submit" disabled={busy}>
            {busy ? "Running pipeline…" : "Redeem · 800 Ixis"}
          </button>
          {cardEnabled ? (
            <button
              type="button"
              disabled={busy}
              onClick={payByCard}
              style={{ background: "var(--card)", color: "var(--ink)", border: "1px solid var(--line)" }}
            >
              {busy ? "Opening card checkout…" : `Pay by card · ${formatUsd(8)}`}
            </button>
          ) : null}
          <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--muted)" }}>
            800 Ixis · $8 per video clip. <a href="/pricing" style={{ color: "var(--accent)" }}>See pricing</a>
            {wantCard && cardEnabled ? " Card checkout is on. Pay by card uses the same $8 price." : ""}
          </p>
          {error ? <div className="err">{error}</div> : null}
        </form>

        <section className="card">
          <p className="meta">{jobs.length} jobs</p>
          <div className="jobs">
            {jobs.length === 0 ? <p className="meta">No jobs yet.</p> : null}
            {jobs.map((job) => (
              <a className="job" key={job.id} href={`/jobs/${job.id}`}>
                <div>
                  <b>{job.idea}</b>
                  <span>{new Date(job.created_at).toLocaleString()}</span>
                </div>
                <div className={`status ${job.status}`}>
                  {job.status}
                  {job.render?.engine === "xai" ? " · grok" : job.render?.videoUrl ? " · mp4" : ""}
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>

      <CixyChatWidget />
    </main>
  );
}

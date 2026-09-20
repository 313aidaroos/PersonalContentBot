"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Job } from "@/lib/types";
import CixyChatWidget from "@/components/CixyChatWidget";
import { formatIxis, formatUsd } from "@/lib/pricing";

export default function HomePage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [idea, setIdea] = useState("");
  const [niche, setNiche] = useState("");
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);

  async function refresh() {
    const res = await fetch("/api/jobs", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load jobs");
    setJobs(data.jobs);
  }

  useEffect(() => {
    // Check if user is authenticated via cookie
    const hasCookie = document.cookie.includes("auth_email");
    if (!hasCookie) {
      router.push("/auth");
      return;
    }
    setAuthed(true);
    refresh().catch((e) => setError(e.message));
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, niche, orientation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Queue failed");
      setIdea("");
      await refresh();
      window.location.href = `/jobs/${data.job.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!authed) return null; // Loading state

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <h1>PersonalContentBot</h1>
          <p>One-minute social videos. 800 Ixis · $8 per clip. <a href="/pricing" style={{ color: "var(--accent)" }}>See pricing</a></p>
        </div>
        <div style={{ display: "flex", gap: "8px", position: "absolute", top: "20px", right: "20px" }}>
          <button 
            onClick={() => router.push("/pricing")}
            style={{ padding: "8px 16px", background: "var(--card)", color: "var(--ink)" }}
          >
            Pricing
          </button>
          <button 
            onClick={() => { 
              document.cookie = "auth_email=; max-age=0";
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
          <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--muted)" }}>
            800 Ixis · $8 per video clip. <a href="/pricing" style={{ color: "var(--accent)" }}>See pricing</a>
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

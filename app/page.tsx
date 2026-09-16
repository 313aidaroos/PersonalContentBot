"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Job } from "@/lib/types";

export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [idea, setIdea] = useState("");
  const [niche, setNiche] = useState("");
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/jobs", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load jobs");
    setJobs(data.jobs);
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);

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

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <h1>PersonalContentBot</h1>
          <p>One-minute social videos. Queue a job. Script, storyboard, and an MP4 land in the table. Posting is Socixis.</p>
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
            {busy ? "Running pipeline…" : "Generate 60s job"}
          </button>
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
                  {job.render?.videoUrl ? " · mp4" : ""}
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type { Job } from "@/lib/types";

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/jobs/${id}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Job not found");
        setJob(data.job);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const frames = job?.storyboard?.frames ?? [];
  const duration = job?.duration_sec ?? 60;
  const current = useMemo(() => {
    if (!job?.script) return null;
    const all = [job.script.hook, ...job.script.beats, job.script.cta];
    return all.find((b) => t >= b.start && t < b.end) || all[all.length - 1];
  }, [job, t]);

  useEffect(() => {
    if (!playing || !job) return;
    const id = window.setInterval(() => {
      setT((x) => (x + 1) % duration);
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, job, duration]);

  if (error) {
    return (
      <main className="wrap">
        <p className="err">{error}</p>
        <p>
          <a href="/">Back</a>
        </p>
      </main>
    );
  }
  if (!job) {
    return (
      <main className="wrap">
        <p className="meta">Loading job…</p>
      </main>
    );
  }

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <h1>
            <a href="/">PersonalContentBot</a>
          </h1>
          <p>
            Job {job.id.slice(0, 8)} · {job.status} · {job.orientation} · {job.duration_sec}s
          </p>
        </div>
      </header>

      <div className="studio">
        <div>
          <div className="phone" aria-label="9:16 preview">
            <div className="time">
              {t}s / {duration}s
            </div>
            <div className="visual">{current?.visual}</div>
            <div className="caption">{current?.onScreen}</div>
            <div className="bar">
              <i style={{ width: `${(t / duration) * 100}%` }} />
            </div>
          </div>
          <button type="button" onClick={() => setPlaying((p) => !p)}>
            {playing ? "Pause preview" : "Play preview"}
          </button>
          {job.render ? <p className="meta">{job.render.note}</p> : null}
        </div>

        <section className="card">
          <p>
            <b>{job.script?.title || job.idea}</b>
          </p>
          <p className="meta">{job.niche || "no niche"} · {job.script?.hashtags?.join(" ")}</p>
          {job.error ? <p className="err">{job.error}</p> : null}
          {(job.script ? [job.script.hook, ...job.script.beats, job.script.cta] : []).map((b) => (
            <div className="beat" key={`${b.start}-${b.onScreen}`}>
              <strong>
                {b.start}–{b.end}s · {b.onScreen}
              </strong>
              <p>{b.voiceover}</p>
              <p>{b.visual}</p>
            </div>
          ))}
          {job.script?.captionsVtt ? (
            <>
              <p className="meta">Captions</p>
              <pre>{job.script.captionsVtt}</pre>
            </>
          ) : null}
          {frames.length ? (
            <>
              <p className="meta">Storyboard frames</p>
              <pre>{JSON.stringify(job.storyboard, null, 2)}</pre>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}

import type { Job } from "./types";

/**
 * What the browser gets. The raw xAI error (render.fallbackReason) stays in the database and
 * server logs only; the UI shows a generic message instead. `heroFallback` tells the UI that a
 * fallback happened without saying why.
 */
export type PublicJob = Omit<Job, "render"> & {
  render: (Omit<NonNullable<Job["render"]>, "fallbackReason"> & { heroFallback?: boolean }) | null;
};

export function toPublicJob(job: Job): PublicJob {
  if (!job.render) return { ...job, render: null };
  const { fallbackReason, ...render } = job.render;
  return { ...job, render: fallbackReason ? { ...render, heroFallback: true } : render };
}

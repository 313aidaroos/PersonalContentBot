export type JobStatus = "queued" | "scripting" | "rendering" | "ready" | "failed";
export type Orientation = "vertical" | "horizontal";

export type Beat = {
  start: number;
  end: number;
  onScreen: string;
  voiceover: string;
  visual: string;
};

export type VideoScript = {
  title: string;
  hook: Beat;
  beats: Beat[];
  cta: Beat;
  captionsVtt: string;
  hashtags: string[];
  /** Who wrote it: the AI writer, or the built-in template fallback (fallback clips are not charged). */
  source?: "anthropic" | "template";
};

export type Storyboard = {
  aspect: "9:16" | "16:9";
  width: number;
  height: number;
  durationSec: number;
  safeZones: { captions: string; faces: string };
  frames: { t: number; caption: string; visual: string }[];
};

export type RenderEngine = "ffmpeg" | "xai" | "stub";

export type RenderClip = {
  source: "xai" | "slides";
  start: number;
  end: number;
  prompt?: string;
  requestId?: string;
  model?: string;
};

export type RenderResult = {
  engine: RenderEngine;
  note: string;
  videoUrl?: string;
  bytes?: number;
  width?: number;
  height?: number;
  durationSec?: number;
  contentType?: "video/mp4";
  clips?: RenderClip[];
  /** Raw hero-clip error. Server-side only: stripped from API responses (see lib/public-job.ts). */
  fallbackReason?: string;
  /** Set when the clip was delivered without charging (hold released), e.g. template-script fallback. */
  billing?: { charged: false; reason: "script_fallback"; note: string };
};

export type Job = {
  id: string;
  idea: string;
  niche: string | null;
  orientation: Orientation;
  duration_sec: number;
  status: JobStatus;
  script: VideoScript | null;
  storyboard: Storyboard | null;
  render: RenderResult | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  /** Durable-job columns (supabase/pcb_jobs_durable.sql). Present only once PCB_DURABLE_JOBS=true. */
  attempt_id?: string | null;
  wallet_reservation_id?: string | null;
  wallet_receipt_id?: string | null;
};

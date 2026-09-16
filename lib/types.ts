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
};

export type Storyboard = {
  aspect: "9:16" | "16:9";
  width: number;
  height: number;
  durationSec: number;
  safeZones: { captions: string; faces: string };
  frames: { t: number; caption: string; visual: string }[];
};

export type RenderStub = {
  engine: "stub";
  note: string;
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
  render: RenderStub | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

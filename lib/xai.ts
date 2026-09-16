/**
 * xAI Grok Imagine video. Fail closed: any auth/billing/limit/timeout error
 * throws XaiUnavailable so the caller can fall back to the ffmpeg slideshow.
 */

export class XaiUnavailable extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "XaiUnavailable";
    this.status = status;
  }
}

const BASE = "https://api.x.ai/v1";
const MODEL = process.env.XAI_VIDEO_MODEL || "grok-imagine-video-1.5";

export function xaiConfigured(): boolean {
  return Boolean(process.env.XAI_API_KEY);
}

function auth() {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new XaiUnavailable(503, "XAI_API_KEY is not set");
  return { Authorization: `Bearer ${key}` };
}

export type XaiClip = {
  url: string;
  durationSec: number;
  requestId: string;
  model: string;
};

export async function generateXaiClip(opts: {
  prompt: string;
  durationSec: number;
  aspect: "9:16" | "16:9";
  resolution?: "480p" | "720p" | "1080p";
  timeoutMs?: number;
}): Promise<XaiClip> {
  const duration = Math.min(15, Math.max(1, Math.round(opts.durationSec)));
  const started = Date.now();
  const timeoutMs = opts.timeoutMs ?? 40_000;

  const start = await fetch(`${BASE}/videos/generations`, {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt: opts.prompt,
      duration,
      aspect_ratio: opts.aspect,
      resolution: opts.resolution ?? "720p",
    }),
  });
  if (!start.ok) {
    const text = (await start.text()).slice(0, 240);
    throw new XaiUnavailable(start.status, `xai start ${start.status}: ${text}`);
  }
  const { request_id } = (await start.json()) as { request_id?: string };
  if (!request_id) throw new XaiUnavailable(502, "xai returned no request_id");

  while (Date.now() - started < timeoutMs) {
    await new Promise((r) => setTimeout(r, 2500));
    const poll = await fetch(`${BASE}/videos/${request_id}`, { headers: auth() });
    if (!poll.ok) {
      const text = (await poll.text()).slice(0, 240);
      throw new XaiUnavailable(poll.status, `xai poll ${poll.status}: ${text}`);
    }
    const data = (await poll.json()) as {
      status?: string;
      video?: { url?: string; duration?: number };
      model?: string;
    };
    if (data.status === "done" && data.video?.url) {
      return {
        url: data.video.url,
        durationSec: data.video.duration ?? duration,
        requestId: request_id,
        model: data.model ?? MODEL,
      };
    }
    if (data.status === "expired" || data.status === "failed") {
      throw new XaiUnavailable(502, `xai ${data.status}`);
    }
  }
  throw new XaiUnavailable(504, `xai timed out after ${timeoutMs}ms`);
}

export async function downloadClip(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new XaiUnavailable(res.status, `clip download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) throw new XaiUnavailable(502, "clip download too small");
  return buf;
}

import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { renderBeatPng } from "./slides";
import { uploadMp4 } from "./storage";
import { downloadClip, generateXaiClip, xaiConfigured, XaiUnavailable } from "./xai";
import type { Beat, Job, RenderClip, RenderResult } from "./types";

const execFileAsync = promisify(execFile);
const HERO_SEC = 15;

function beatsOf(job: Job): Beat[] {
  if (!job.script) throw new Error("script missing");
  return [job.script.hook, ...job.script.beats, job.script.cta];
}

function size(job: Job) {
  const vertical = job.orientation !== "horizontal";
  return vertical ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
}

function ffmpegBin() {
  const local = path.join(process.cwd(), "bin", "ffmpeg");
  if (existsSync(local)) return local;
  throw new Error("ffmpeg binary missing — run node scripts/fetch-ffmpeg.mjs");
}

function q(file: string) {
  return `file '${file.replace(/'/g, "'\\''")}'`;
}

async function ffmpeg(args: string[], timeout = 90_000) {
  await execFileAsync(ffmpegBin(), ["-hide_banner", "-loglevel", "error", "-y", ...args], { timeout });
}

function heroPrompt(job: Job): string {
  const hook = job.script?.hook;
  const vertical = job.orientation !== "horizontal";
  return [
    hook?.visual ?? job.idea,
    `Subject: ${job.idea}.`,
    job.niche ? `Context: ${job.niche}.` : "",
    vertical ? "Vertical 9:16 framing, subject in the upper two thirds." : "Wide 16:9 framing.",
    "Cinematic, natural light, smooth camera move, no on-screen text, no captions, no logos.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Slides for the beats that remain after `fromSec`. */
async function renderSlides(job: Job, dir: string, fromSec: number): Promise<{ path: string; clips: RenderClip[] } | null> {
  const { width, height } = size(job);
  const beats = beatsOf(job)
    .map((b) => ({ ...b, start: Math.max(b.start, fromSec) }))
    .filter((b) => b.end - b.start >= 0.5);
  if (!beats.length) return null;

  const concat: string[] = [];
  const clips: RenderClip[] = [];
  for (const [i, beat] of beats.entries()) {
    const png = await renderBeatPng({ beat, index: i, total: beats.length, width, height, idea: job.idea });
    const file = path.join(dir, `slide-${String(i).padStart(2, "0")}.png`);
    await writeFile(file, png);
    concat.push(q(file), `duration ${beat.end - beat.start}`);
    if (i === beats.length - 1) concat.push(q(file));
    clips.push({ source: "slides", start: beat.start, end: beat.end });
  }
  const list = path.join(dir, "slides.txt");
  const out = path.join(dir, "slides.mp4");
  await writeFile(list, concat.join("\n") + "\n");
  await ffmpeg([
    "-f", "concat", "-safe", "0", "-i", list,
    "-vf", "fps=30,format=yuv420p",
    "-c:v", "libx264", "-preset", "ultrafast", "-tune", "stillimage", "-crf", "23",
    "-pix_fmt", "yuv420p", "-an", out,
  ]);
  return { path: out, clips };
}

/** Grok hero clip normalised to the job's frame so it can be concat-copied. */
async function renderHero(job: Job, dir: string): Promise<{ path: string; clip: RenderClip }> {
  const { width, height } = size(job);
  const aspect = job.orientation !== "horizontal" ? "9:16" : "16:9";
  const prompt = heroPrompt(job);
  const clip = await generateXaiClip({
    prompt,
    durationSec: HERO_SEC,
    aspect,
    resolution: (process.env.XAI_VIDEO_RESOLUTION as "480p" | "720p" | "1080p") || "720p",
    timeoutMs: Number(process.env.XAI_VIDEO_TIMEOUT_MS || 150_000),
  });
  const raw = path.join(dir, "hero-raw.mp4");
  await writeFile(raw, await downloadClip(clip.url));
  const out = path.join(dir, "hero.mp4");
  await ffmpeg([
    "-i", raw,
    "-t", String(HERO_SEC),
    "-vf", `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=30,format=yuv420p`,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
    "-pix_fmt", "yuv420p", "-an", out,
  ]);
  return {
    path: out,
    clip: {
      source: "xai",
      start: 0,
      end: Math.min(HERO_SEC, clip.durationSec),
      prompt,
      requestId: clip.requestId,
      model: clip.model,
    },
  };
}

export async function renderJobMp4(job: Job): Promise<RenderResult> {
  const { width, height } = size(job);
  const dir = path.join(tmpdir(), `pcb-${job.id}`);
  await mkdir(dir, { recursive: true });

  try {
    let engine: RenderResult["engine"] = "ffmpeg";
    let fallbackReason: string | undefined;
    let hero: { path: string; clip: RenderClip } | null = null;

    const wantXai = xaiConfigured() && process.env.PCB_VIDEO_ENGINE !== "ffmpeg";
    const heroPromise = wantXai
      ? renderHero(job, dir).catch((err: unknown) => {
          fallbackReason =
            err instanceof XaiUnavailable
              ? `xai ${err.status}: ${err.message}`
              : err instanceof Error
                ? err.message
                : String(err);
          return null;
        })
      : Promise.resolve(null);

    // Encode slides while Grok works. Slides start where the hero ends.
    const slidesPromise = renderSlides(job, dir, wantXai ? HERO_SEC : 0);
    const [heroResult, slidesFromHero] = await Promise.all([heroPromise, slidesPromise]);
    hero = heroResult;

    let slides = slidesFromHero;
    if (wantXai && !hero) {
      // Grok failed: re-render the full slideshow from 0 so the video is still 60s.
      slides = await renderSlides(job, dir, 0);
    } else if (hero) {
      engine = "xai";
    }

    const parts = [hero?.path, slides?.path].filter((p): p is string => Boolean(p));
    if (!parts.length) throw new Error("nothing to render");

    let outPath: string;
    if (parts.length === 1) {
      outPath = parts[0];
    } else {
      const list = path.join(dir, "final.txt");
      outPath = path.join(dir, "final.mp4");
      await writeFile(list, parts.map(q).join("\n") + "\n");
      await ffmpeg(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", outPath], 30_000);
    }

    const buf = await readFile(outPath);
    if (buf.length < 32 || !buf.subarray(4, 8).toString("ascii").includes("ftyp")) {
      throw new Error("ffmpeg did not produce an MP4");
    }
    const videoUrl = await uploadMp4(`${job.id}.mp4`, buf);
    const clips: RenderClip[] = [...(hero ? [hero.clip] : []), ...(slides?.clips ?? [])];

    return {
      engine,
      note:
        engine === "xai"
          ? `Grok Imagine hero clip (0–${HERO_SEC}s) + caption slides to 60s. Silent. Not posted — Socixis handles distribution.`
          : `Silent slideshow MP4 from the script beats.${fallbackReason ? " Grok clip skipped." : ""} Not posted — Socixis handles distribution.`,
      videoUrl,
      bytes: buf.length,
      width,
      height,
      durationSec: job.duration_sec,
      contentType: "video/mp4",
      clips,
      ...(fallbackReason ? { fallbackReason } : {}),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

import { execFile } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { renderBeatPng } from "./slides";
import { uploadMp4 } from "./storage";
import type { Beat, Job, RenderResult } from "./types";

const execFileAsync = promisify(execFile);

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

export async function renderJobMp4(job: Job): Promise<RenderResult> {
  const beats = beatsOf(job);
  const { width, height } = size(job);
  const dir = path.join(tmpdir(), `pcb-${job.id}`);
  await mkdir(dir, { recursive: true });

  try {
    const concat: string[] = [];
    for (const [i, beat] of beats.entries()) {
      const png = await renderBeatPng({
        beat,
        index: i,
        total: beats.length,
        width,
        height,
        idea: job.idea,
      });
      const file = path.join(dir, `${String(i).padStart(2, "0")}.png`);
      await writeFile(file, png);
      const duration = Math.max(0.5, beat.end - beat.start);
      concat.push(`file '${file.replace(/'/g, "'\\''")}'`);
      concat.push(`duration ${duration}`);
      if (i === beats.length - 1) concat.push(`file '${file.replace(/'/g, "'\\''")}'`);
    }

    const listPath = path.join(dir, "concat.txt");
    const outPath = path.join(dir, "out.mp4");
    await writeFile(listPath, concat.join("\n") + "\n");

    await execFileAsync(
      ffmpegBin(),
      [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listPath,
        "-vf",
        "fps=30,format=yuv420p",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-an",
        outPath,
      ],
      { timeout: 45_000 },
    );

    const buf = await readFile(outPath);
    if (buf.length < 32 || !buf.subarray(4, 8).toString("ascii").includes("ftyp")) {
      throw new Error("ffmpeg did not produce an MP4");
    }
    const videoUrl = await uploadMp4(`${job.id}.mp4`, buf);
    const info = await stat(outPath);
    return {
      engine: "ffmpeg",
      note: "Silent 9:16 slideshow MP4 from the script beats. Not posted — Socixis handles distribution.",
      videoUrl,
      bytes: info.size,
      width,
      height,
      durationSec: job.duration_sec,
      contentType: "video/mp4",
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

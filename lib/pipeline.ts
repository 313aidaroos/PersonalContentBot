import { insertJob, patchJob } from "./db";
import { generateScript } from "./script";
import type { Job, Orientation, Storyboard } from "./types";

function storyboardFrom(job: Job): Storyboard {
  const script = job.script;
  if (!script) throw new Error("script missing");
  const vertical = job.orientation !== "horizontal";
  const all = [script.hook, ...script.beats, script.cta];
  return {
    aspect: vertical ? "9:16" : "16:9",
    width: vertical ? 1080 : 1920,
    height: vertical ? 1920 : 1080,
    durationSec: job.duration_sec,
    safeZones: {
      captions: "Keep captions in the middle 40–75% of frame height (above platform UI).",
      faces: "Keep faces in the upper 60%. Never cover with stickers or CTA bars.",
    },
    frames: all.map((b) => ({
      t: b.start,
      caption: b.onScreen,
      visual: b.visual,
    })),
  };
}

export async function queueAndRun(input: {
  idea: string;
  niche?: string;
  orientation?: Orientation;
}): Promise<Job> {
  const idea = input.idea.trim();
  if (idea.length < 3) throw new Error("Idea is too short");
  if (idea.length > 280) throw new Error("Idea is too long");

  let job = await insertJob({
    idea,
    niche: input.niche?.trim() || null,
    orientation: input.orientation === "horizontal" ? "horizontal" : "vertical",
    duration_sec: 60,
  });

  try {
    job = await patchJob(job.id, { status: "scripting" });
    const script = await generateScript(job.idea, job.niche, job.orientation);
    job = await patchJob(job.id, { status: "rendering", script });

    const storyboard = storyboardFrom({ ...job, script });
    job = await patchJob(job.id, {
      status: "ready",
      storyboard,
      render: {
        engine: "stub",
        note: "Script and 9:16 storyboard are real. MP4 render (ffmpeg/Runway) is not wired on this slice. Socixis posts; this bot only makes the video job.",
      },
      error: null,
    });
    return job;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await patchJob(job.id, { status: "failed", error: message });
    throw err;
  }
}

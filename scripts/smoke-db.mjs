import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const table = env.PCB_JOBS_TABLE || "pcb_jobs";
if (!url || !key) {
  console.error("missing supabase env");
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const idea = "Why the first two seconds of a coffee reel have to be the pour, not the origin story";
const insertRes = await fetch(`${url}/rest/v1/${table}`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    idea,
    niche: "specialty coffee",
    orientation: "vertical",
    duration_sec: 60,
    status: "queued",
  }),
});
if (!insertRes.ok) {
  console.error("insert failed", insertRes.status, (await insertRes.text()).slice(0, 200));
  process.exit(1);
}
const [job] = await insertRes.json();
const patchRes = await fetch(`${url}/rest/v1/${table}?id=eq.${job.id}`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({
    status: "ready",
    script: {
      title: idea,
      hook: { start: 0, end: 2, onScreen: "Watch the pour", voiceover: "Stop. Watch the pour.", visual: "Close pour" },
      beats: [],
      cta: { start: 52, end: 60, onScreen: "Loop it", voiceover: "Replay.", visual: "Back to pour" },
      captionsVtt: "WEBVTT\n",
      hashtags: ["#shorts"],
    },
    storyboard: { aspect: "9:16", width: 1080, height: 1920, durationSec: 60, safeZones: { captions: "mid", faces: "top" }, frames: [] },
    render: { engine: "stub", note: "smoke" },
    updated_at: new Date().toISOString(),
  }),
});
if (!patchRes.ok) {
  console.error("patch failed", patchRes.status, (await patchRes.text()).slice(0, 200));
  process.exit(1);
}
const listRes = await fetch(`${url}/rest/v1/${table}?id=eq.${job.id}&select=id,status,idea`, { headers });
const rows = await listRes.json();
console.log("smoke", rows[0]?.status, rows[0]?.id ? "id-ok" : "id-missing");

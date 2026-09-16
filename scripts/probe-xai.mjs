/**
 * One real xAI video probe. Prints status codes and shape only, no secrets.
 * usage: node scripts/probe-xai.mjs
 */
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
const hermesEnvPath = path.join(process.env.HOME || "", ".hermes/.env");
const hermes = fs.existsSync(hermesEnvPath)
  ? Object.fromEntries(
      fs.readFileSync(hermesEnvPath, "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
        .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; }),
    )
  : {};
const key = env.XAI_API_KEY || hermes.XAI_API_KEY;
if (!key) {
  console.error("no XAI_API_KEY");
  process.exit(1);
}

const duration = Number(process.argv[2] || 4);
const start = await fetch("https://api.x.ai/v1/videos/generations", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "grok-imagine-video-1.5",
    prompt: "Slow pour of espresso into a glass cup, warm light, vertical framing, no text",
    duration,
    aspect_ratio: "9:16",
    resolution: "480p",
  }),
});
const startText = await start.text();
console.log("start", start.status, startText.slice(0, 300));
if (!start.ok) process.exit(2);
const { request_id } = JSON.parse(startText);

for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  const poll = await fetch(`https://api.x.ai/v1/videos/${request_id}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const text = await poll.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {}
  console.log("poll", i, poll.status, data.status, Object.keys(data).join(","));
  if (data.status === "done") {
    console.log("video keys", Object.keys(data.video || {}).join(","));
    console.log("url host", data.video?.url ? new URL(data.video.url).host : "none");
    console.log("duration", data.video?.duration);
    process.exit(0);
  }
  if (data.status === "expired" || data.status === "failed") {
    console.log("terminal", text.slice(0, 400));
    process.exit(3);
  }
}
console.log("timed out");
process.exit(4);

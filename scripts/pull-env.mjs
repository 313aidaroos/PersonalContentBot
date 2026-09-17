/**
 * Pulls production env from Vercel into .env.local. Never prints values.
 * usage: node scripts/pull-env.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT = "prj_DXhM7WBdFB5CAYTselm7sYp84wD6";

function parseEnv(text) {
  const out = {};
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    out[line.slice(0, i)] = line.slice(i + 1);
  }
  return out;
}

const hermesEnv = path.join(process.env.HOME || "", ".hermes/.env");
const token =
  process.env.VERCEL_TOKEN ||
  (fs.existsSync(hermesEnv) ? parseEnv(fs.readFileSync(hermesEnv, "utf8")).VERCEL_TOKEN : "");
if (!token) {
  console.error("no vercel token");
  process.exit(1);
}

const res = await fetch(`https://api.vercel.com/v10/projects/${PROJECT}/env?decrypt=true&target=production`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!res.ok) {
  console.error("env list failed", res.status);
  process.exit(1);
}
const { envs } = await res.json();
const lines = [];
for (const e of envs) {
  if (!e.target?.includes("production")) continue;
  if (typeof e.value !== "string") continue;
  lines.push(`${e.key}=${e.value}`);
  console.log("pulled", e.key);
}
fs.writeFileSync(path.join(root, ".env.local"), lines.join("\n") + "\n");
console.log("written .env.local", lines.length, "vars");

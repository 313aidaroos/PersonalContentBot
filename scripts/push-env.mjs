/**
 * Pushes .env.local keys to the Vercel project without printing values.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");
const names = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PCB_JOBS_TABLE",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

function parseEnv(text) {
  const out = {};
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    out[line.slice(0, i)] = line.slice(i + 1);
  }
  return out;
}

const local = parseEnv(fs.readFileSync(envPath, "utf8"));
const hermesEnvPath = path.join(process.env.HOME || "", ".hermes/.env");
const token = process.env.VERCEL_TOKEN || (fs.existsSync(hermesEnvPath) ? parseEnv(fs.readFileSync(hermesEnvPath, "utf8")).VERCEL_TOKEN : "");
if (!token) {
  console.error("no vercel token");
  process.exit(1);
}

const project = process.argv[2];
if (!project) {
  console.error("usage: node scripts/push-env.mjs <projectId>");
  process.exit(1);
}

async function upsert(key, value) {
  const res = await fetch(`https://api.vercel.com/v10/projects/${project}/env?upsert=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key,
      value,
      type: "encrypted",
      target: ["production", "preview", "development"],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${key} ${res.status} ${t.slice(0, 200)}`);
  }
}

for (const name of names) {
  const value = local[name];
  if (!value) {
    console.log("skip", name);
    continue;
  }
  await upsert(name, value);
  console.log("set", name);
}

if (process.env.ANTHROPIC_API_KEY) {
  await upsert("ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY);
  console.log("set ANTHROPIC_API_KEY");
}

console.log("env upsert done");

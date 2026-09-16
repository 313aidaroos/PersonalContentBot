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
const bucket = env.PCB_VIDEO_BUCKET || "pcb-videos";
if (!url || !key) {
  console.error("missing supabase env");
  process.exit(1);
}

const res = await fetch(`${url}/storage/v1/bucket`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    id: bucket,
    name: bucket,
    public: true,
    file_size_limit: 52428800,
  }),
});
const text = await res.text();
if (res.ok || res.status === 409 || /already exists|duplicate/i.test(text)) {
  console.log("bucket ready", bucket, res.status);
  process.exit(0);
}
console.error("bucket failed", res.status, text.slice(0, 300));
process.exit(1);

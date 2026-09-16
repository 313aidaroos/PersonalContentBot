/**
 * Creates pcb_jobs on Awad's personal Supabase project (not another company).
 * Writes .env.local. Never prints secrets.
 */
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = "myfclypikkcvfurkbzmj";
const TABLE = "pcb_jobs";

if (!TOKEN) {
  console.error("SUPABASE_ACCESS_TOKEN missing");
  process.exit(1);
}

const sql = `
create table if not exists public.${TABLE} (
  id uuid primary key default gen_random_uuid(),
  idea text not null,
  niche text,
  orientation text not null default 'vertical',
  duration_sec integer not null default 60,
  status text not null default 'queued',
  script jsonb,
  storyboard jsonb,
  render jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pcb_jobs_created_at_idx on public.${TABLE} (created_at desc);
alter table public.${TABLE} enable row level security;
`;

async function runQuery(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text: text.slice(0, 800) };
}

const q = await runQuery(sql);
if (!q.ok) {
  console.error("sql failed", q.status, q.text);
  process.exit(1);
}
console.log("table ready");

const keysRes = await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});
if (!keysRes.ok) {
  console.error("api-keys failed", keysRes.status);
  process.exit(1);
}
const keys = await keysRes.json();
const service = (keys.find((k) => k.name === "service_role" || k.type === "service_role") || {}).api_key;
const anon = (keys.find((k) => k.name === "anon" || k.type === "anon") || {}).api_key;
if (!service) {
  console.error("no service_role key");
  process.exit(1);
}

const url = `https://${REF}.supabase.co`;
const env = [
  `NEXT_PUBLIC_SUPABASE_URL=${url}`,
  `SUPABASE_URL=${url}`,
  `SUPABASE_SERVICE_ROLE_KEY=${service}`,
  anon ? `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}` : "",
  `PCB_JOBS_TABLE=${TABLE}`,
].filter(Boolean).join("\n") + "\n";

const fs = await import("node:fs");
fs.writeFileSync(new URL("../.env.local", import.meta.url), env);
console.log("env.local written (keys not logged)");
console.log("ref", REF);
console.log("table", TABLE);
console.log("url host", `${REF}.supabase.co`);

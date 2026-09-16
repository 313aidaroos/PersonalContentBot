import type { Job, JobStatus } from "./types";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function table() {
  return process.env.PCB_JOBS_TABLE || "pcb_jobs";
}

function restHeaders(prefer?: string) {
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (prefer) headers.Prefer = prefer;
  return headers;
}

function restUrl(path = "") {
  return `${required("SUPABASE_URL")}/rest/v1/${table()}${path}`;
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) throw new Error(`jobs table ${res.status}: ${text.slice(0, 240)}`);
  return text ? (JSON.parse(text) as T) : (null as T);
}

export async function listJobs(): Promise<Job[]> {
  return parse<Job[]>(
    await fetch(`${restUrl("?select=*&order=created_at.desc&limit=40")}`, {
      headers: restHeaders(),
      cache: "no-store",
    }),
  );
}

export async function getJob(id: string): Promise<Job | null> {
  const rows = await parse<Job[]>(
    await fetch(`${restUrl(`?id=eq.${encodeURIComponent(id)}&select=*&limit=1`)}`, {
      headers: restHeaders(),
      cache: "no-store",
    }),
  );
  return rows[0] ?? null;
}

export async function insertJob(row: {
  idea: string;
  niche: string | null;
  orientation: "vertical" | "horizontal";
  duration_sec: number;
}): Promise<Job> {
  const rows = await parse<Job[]>(
    await fetch(restUrl(), {
      method: "POST",
      headers: restHeaders("return=representation"),
      body: JSON.stringify({ ...row, status: "queued" satisfies JobStatus }),
    }),
  );
  if (!rows[0]) throw new Error("insert returned no row");
  return rows[0];
}

export async function patchJob(
  id: string,
  patch: Partial<Pick<Job, "status" | "script" | "storyboard" | "render" | "error">>,
): Promise<Job> {
  const rows = await parse<Job[]>(
    await fetch(`${restUrl(`?id=eq.${encodeURIComponent(id)}`)}`, {
      method: "PATCH",
      headers: restHeaders("return=representation"),
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    }),
  );
  if (!rows[0]) throw new Error("patch returned no row");
  return rows[0];
}

export async function pingTable(): Promise<boolean> {
  const res = await fetch(`${restUrl("?select=id&limit=1")}`, {
    headers: restHeaders(),
    cache: "no-store",
  });
  return res.ok;
}

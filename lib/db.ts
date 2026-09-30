// Change note (Claude, Sep 2026): Every job read/write is scoped to `owner_email`. See docs/LAUNCH_NOTES.md.
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
  return `${process.env.SUPABASE_URL || required("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/${table()}${path}`;
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) throw new Error(`jobs table ${res.status}: ${text.slice(0, 240)}`);
  return text ? (JSON.parse(text) as T) : (null as T);
}

/** A member only ever sees their own jobs (owner_email = verified session email). */
async function listJobsForOwner(ownerEmail: string): Promise<Job[]> {
  const owner = encodeURIComponent(ownerEmail.toLowerCase());
  return parse<Job[]>(
    await fetch(`${restUrl(`?owner_email=eq.${owner}&select=*&order=created_at.desc&limit=40`)}`, {
      headers: restHeaders(),
      cache: "no-store",
    }),
  );
}

async function getJobForOwner(id: string, ownerEmail: string): Promise<Job | null> {
  const owner = encodeURIComponent(ownerEmail.toLowerCase());
  const rows = await parse<Job[]>(
    await fetch(`${restUrl(`?id=eq.${encodeURIComponent(id)}&owner_email=eq.${owner}&select=*&limit=1`)}`, {
      headers: restHeaders(),
      cache: "no-store",
    }),
  );
  return rows[0] ?? null;
}

// Compatibility for jobs written by the former SSO path. The subject must come only
// from the verified user's server-managed app_metadata, never the request body.
function legacyOwner(apixisSub?: string | null): string | null {
  return apixisSub && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(apixisSub)
    ? apixisSub.toLowerCase() : null;
}

export async function listJobs(ownerEmail: string, apixisSub?: string | null): Promise<Job[]> {
  const legacy = legacyOwner(apixisSub);
  const groups = await Promise.all([
    listJobsForOwner(ownerEmail),
    legacy ? listJobsForOwner(legacy) : Promise.resolve([]),
  ]);
  return [...new Map(groups.flat().map(job => [job.id, job])).values()]
    .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 40);
}

export async function getJob(id: string, ownerEmail: string, apixisSub?: string | null): Promise<Job | null> {
  const job = await getJobForOwner(id, ownerEmail);
  if (job) return job;
  const legacy = legacyOwner(apixisSub);
  return legacy ? getJobForOwner(id, legacy) : null;
}

export async function insertJob(row: {
  owner_email: string;
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

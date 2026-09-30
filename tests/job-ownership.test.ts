import { describe, it, expect, jest, beforeEach, afterAll } from "@jest/globals";
import { getJob, listJobs } from "@/lib/db";
const sub = "11111111-1111-4111-8111-111111111111";
const originalFetch = global.fetch;
beforeEach(() => {
  process.env.SUPABASE_URL = "https://db.example";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
});
afterAll(() => { global.fetch = originalFetch; });
describe("job owner queries", () => {
  it("retrieves existing SSO jobs using only the trusted subject", async () => {
    const calls: string[] = [];
    global.fetch = jest.fn(async (url: unknown) => {
      calls.push(String(url));
      return new Response(JSON.stringify(String(url).includes(sub) ? [{ id: "job-1" }] : []));
    }) as typeof fetch;
    expect((await getJob("job-1", "owner@example.com", sub))?.id).toBe("job-1");
    expect(calls).toHaveLength(2);
    expect(calls.every(url => url.includes("owner_email=eq."))).toBe(true);
  });
  it("never broadens ownership for an invalid subject", async () => {
    const fetchMock = jest.fn(async () => new Response("[]"));
    global.fetch = fetchMock as typeof fetch;
    expect(await getJob("job-1", "owner@example.com", "other@example.com")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("combines current and legacy jobs without duplicate rows", async () => {
    global.fetch = jest.fn(async (url: unknown) => new Response(JSON.stringify(String(url).includes(sub)
      ? [{ id: "old", created_at: "2026-09-29" }, { id: "same", created_at: "2026-09-28" }]
      : [{ id: "new", created_at: "2026-09-30" }, { id: "same", created_at: "2026-09-28" }]
    ))) as typeof fetch;
    expect((await listJobs("owner@example.com", sub)).map(job => job.id)).toEqual(["new", "old", "same"]);
  });
});

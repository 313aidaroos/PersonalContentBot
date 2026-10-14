import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import type { Job } from "@/lib/types";

const rows = new Map<string, Job>();
const fetches: string[] = [];

jest.mock("@/lib/db", () => ({
  findJobByAttempt: async () => null,
  durableJobsEnabled: () => false,
  insertJob: async (row: Partial<Job>) => {
    const job = {
      id: "job-card",
      status: "queued",
      script: null,
      storyboard: null,
      render: null,
      error: null,
      created_at: "",
      updated_at: "",
      ...row,
    } as Job;
    rows.set(job.id, job);
    return job;
  },
  patchJob: async (id: string, patch: Partial<Job>) => {
    const job = { ...rows.get(id)!, ...patch } as Job;
    rows.set(id, job);
    return job;
  },
}));

jest.mock("@/lib/render", () => ({
  renderJobMp4: async () => ({ engine: "ffmpeg", note: "slides", videoUrl: "https://x/v.mp4" }),
}));

jest.mock("@/lib/script", () => {
  const actual = jest.requireActual("@/lib/script") as typeof import("@/lib/script");
  return {
    ...actual,
    generateScriptWithSource: async (idea: string, niche: string | null, o: "vertical" | "horizontal") => ({
      script: { ...actual.buildTemplateScript(idea, niche, o), source: "anthropic" as const },
      source: "anthropic" as const,
    }),
  };
});

jest.mock("@/lib/stripe-client", () => ({
  verifyPaidClip: async () => ({
    sessionId: "cs_test_clip",
    attemptId: "attempt-card-01",
    idea: "three hooks for cold brew",
    niche: "coffee",
    orientation: "vertical" as const,
    paymentIntentId: "pi_clip",
    amountCents: 800,
    currency: "usd",
  }),
}));

beforeEach(() => {
  fetches.length = 0;
  rows.clear();
  delete process.env.SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SECRET_KEY;
  global.fetch = (async (url: string) => {
    fetches.push(String(url));
    return new Response("{}", { status: 404 });
  }) as unknown as typeof fetch;
});

describe("card-paid clips", () => {
  it("renders a clip from a paid card session and does not call the Wallet", async () => {
    const { queueAndRunWithCardPayment } = await import("@/lib/pipeline");
    const job = await queueAndRunWithCardPayment({ ownerEmail: "owner@example.com", checkoutSessionId: "cs_test_clip" });
    expect(job.status).toBe("ready");
    expect(job.idea).toBe("three hooks for cold brew");
    expect(fetches.some((url) => url.includes("apixis-wallet") || url.includes("/api/v1/"))).toBe(false);
    expect(fetches).toEqual([]);
  });
});

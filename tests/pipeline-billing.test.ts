import { describe, it, expect, jest, beforeAll, afterAll } from "@jest/globals";
import type { Job } from "@/lib/types";

// Stub the side effects; keep the real Wallet client so we see capture vs release.
const rows = new Map<string, Job>();
jest.mock("@/lib/db", () => ({
  insertJob: async (row: Partial<Job>) => {
    const job = { id: "job-1", status: "queued", script: null, storyboard: null, render: null, error: null, created_at: "", updated_at: "", ...row } as Job;
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
let scriptSource: "anthropic" | "template" = "template";
jest.mock("@/lib/script", () => {
  const actual = jest.requireActual("@/lib/script") as typeof import("@/lib/script");
  return {
    ...actual,
    generateScriptWithSource: async (idea: string, niche: string | null, o: "vertical" | "horizontal") => ({
      script: { ...actual.buildTemplateScript(idea, niche, o), source: scriptSource },
      source: scriptSource,
      fallbackReason: scriptSource === "template" ? "anthropic 529" : undefined,
    }),
  };
});

const walletCalls: string[] = [];
const realFetch = global.fetch;
beforeAll(() => {
  process.env.WALLET_API_KEY = "k".repeat(40);
  global.fetch = (async (url: string) => {
    const u = String(url);
    walletCalls.push(u.replace(/^https:\/\/[^/]+/, ""));
    if (u.endsWith("/api/v1/reservations")) return new Response(JSON.stringify({ reservationId: "r1", status: "held", productKey: "contentbot.clip", ixis: 800 }), { status: 200 });
    if (u.endsWith("/capture")) return new Response(JSON.stringify({ reservationId: "r1", status: "captured", receiptId: "rc1" }), { status: 200 });
    if (u.endsWith("/release")) return new Response(JSON.stringify({ reservationId: "r1", status: "released" }), { status: 200 });
    return new Response("{}", { status: 404 });
  }) as unknown as typeof fetch;
});
afterAll(() => { global.fetch = realFetch; });

describe("fallback billing", () => {
  it("template fallback: releases the hold, never captures, still delivers the clip marked free", async () => {
    walletCalls.length = 0;
    scriptSource = "template";
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { queueAndRunWithPayment } = await import("@/lib/pipeline");
    const job = await queueAndRunWithPayment({ idea: "three hooks", ownerEmail: "a@b.co", attemptId: "attempt-000001" });
    warn.mockRestore();
    expect(walletCalls).toEqual(["/api/v1/reservations", "/api/v1/reservations/r1/release"]);
    expect(job.status).toBe("ready");
    expect(job.render?.billing?.charged).toBe(false);
    expect(job.script?.source).toBe("template");
  });

  it("AI script: captures as before", async () => {
    walletCalls.length = 0;
    scriptSource = "anthropic";
    const { queueAndRunWithPayment } = await import("@/lib/pipeline");
    const job = await queueAndRunWithPayment({ idea: "three hooks", ownerEmail: "a@b.co", attemptId: "attempt-000002" });
    expect(walletCalls).toEqual(["/api/v1/reservations", "/api/v1/reservations/r1/capture"]);
    expect(job.render?.billing).toBeUndefined();
  });
});

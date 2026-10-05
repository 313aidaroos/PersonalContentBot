import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { toPublicJob } from "@/lib/public-job";
import { generateScriptWithSource, scriptModel, DEFAULT_SCRIPT_MODEL } from "@/lib/script";
import { CIXY_SYSTEM_PROMPT } from "@/lib/cixy-persona";
import type { Job } from "@/lib/types";

const baseJob: Job = {
  id: "00000000-0000-0000-0000-000000000000",
  idea: "test idea",
  niche: null,
  orientation: "vertical",
  duration_sec: 60,
  status: "ready",
  script: null,
  storyboard: null,
  render: { engine: "ffmpeg", note: "n", fallbackReason: "xai 403: raw provider error" },
  error: null,
  created_at: "",
  updated_at: "",
};

describe("toPublicJob", () => {
  it("strips the raw xAI fallback reason and flags the fallback", () => {
    const pub = toPublicJob(baseJob);
    expect(JSON.stringify(pub)).not.toContain("raw provider error");
    expect(pub.render?.heroFallback).toBe(true);
  });
  it("leaves clean renders alone", () => {
    const pub = toPublicJob({ ...baseJob, render: { engine: "xai", note: "n" } });
    expect(pub.render?.heroFallback).toBeUndefined();
  });
});

describe("script fallback + model", () => {
  const env = { ...process.env };
  beforeEach(() => { delete process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_MODEL; });
  afterEach(() => { process.env = { ...env }; });

  it("marks template fallback so the pipeline can release the hold", async () => {
    const out = await generateScriptWithSource("hooks that work", null, "vertical");
    expect(out.source).toBe("template");
    expect(out.script.source).toBe("template");
    expect(out.script.captionsVtt.startsWith("WEBVTT")).toBe(true);
  });

  it("marks template fallback when the Anthropic call fails", async () => {
    process.env.ANTHROPIC_API_KEY = "x".repeat(40);
    const realFetch = global.fetch;
    global.fetch = (async () => new Response("nope", { status: 500 })) as typeof fetch;
    try {
      const out = await generateScriptWithSource("hooks that work", "fitness", "vertical");
      expect(out.source).toBe("template");
      expect(out.fallbackReason).toBe("anthropic 500");
    } finally {
      global.fetch = realFetch;
    }
  });

  it("uses ANTHROPIC_MODEL, else the previous hard-coded model", () => {
    expect(scriptModel()).toBe(DEFAULT_SCRIPT_MODEL);
    expect(DEFAULT_SCRIPT_MODEL).toBe("claude-sonnet-4-5");
    process.env.ANTHROPIC_MODEL = "claude-test-model";
    expect(scriptModel()).toBe("claude-test-model");
  });
});

describe("Cixy persona", () => {
  it("uses the shared family core v2: plain hello, no religious content (Awad's lock), no identity label", () => {
    expect(CIXY_SYSTEM_PROMPT).toMatch(/Greet with a plain, friendly hello/);
    expect(CIXY_SYSTEM_PROMPT).toMatch(/hospitality, courtesy, patience/);
    expect(CIXY_SYSTEM_PROMPT).toMatch(/never on religious grounds/);
    // v2's guard sentences forbid religious content ("Do not use religious greetings…", "never on
    // religious grounds"), so strip those two policy sentences before banning the word "religious".
    const withoutGuards = CIXY_SYSTEM_PROMPT
      .replace(/- Greet with a plain, friendly hello\.[^\n]*\n/, "")
      .replace(/- Decline only what is genuinely harmful[^\n]*\n/, "");
    expect(CIXY_SYSTEM_PROMPT).not.toMatch(
      /salaam|salam|insha|alhamdulillah|mashallah|bismillah|halal|haram|prayer|ramadan|hijri|\beid\b|muslim|islam|faith|scholar|riba|alcohol|pork|gambl/i,
    );
    expect(withoutGuards).not.toMatch(/religious/i);
    expect(CIXY_SYSTEM_PROMPT).toMatch(/PhD-level expert in short-form social video/);
    expect(CIXY_SYSTEM_PROMPT).toMatch(/defer to his direction/);
  });
});

describe("Wallet host (env.example value)", () => {
  it("host-only APIXIS_WALLET_API_URL gives /buy and /api/v1 paths, never /api/v1/buy", async () => {
    const prev = process.env.APIXIS_WALLET_API_URL;
    process.env.APIXIS_WALLET_API_URL = "https://apixis-wallet.vercel.app";
    let buy = "";
    const calls: string[] = [];
    const realFetch = global.fetch;
    global.fetch = (async (url: string) => {
      calls.push(String(url));
      return new Response(JSON.stringify({ xp: 800 }), { status: 200 });
    }) as unknown as typeof fetch;
    try {
      await jestIsolate(async () => {
        const w = await import("@/lib/apixis-wallet");
        buy = w.buyIxisUrl("contentbot", "https://personalcontentbot.vercel.app");
        await w.quote("contentbot.clip");
      });
    } finally {
      global.fetch = realFetch;
      if (prev === undefined) delete process.env.APIXIS_WALLET_API_URL; else process.env.APIXIS_WALLET_API_URL = prev;
    }
    expect(buy.startsWith("https://apixis-wallet.vercel.app/buy?")).toBe(true);
    expect(calls[0]).toBe("https://apixis-wallet.vercel.app/api/v1/quotes");
  });
});

async function jestIsolate(fn: () => Promise<void>) {
  const { jest } = await import("@jest/globals");
  let p: Promise<void> = Promise.resolve();
  jest.isolateModules(() => { p = fn(); });
  await p;
}

// Change note (Sep 2026): No paid API calls. Cixy = "Anthropic key configured"; ffmpeg checked for real (binary + -version).
import { execFile } from "node:child_process";
import { accessSync, constants, existsSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { pingTable } from "@/lib/db";

export const dynamic = "force-dynamic";

// Cached engine status (5min TTL per Awad's requirement). The table ping is not cached.
let cachedHealth: { timestamp: number; ffmpegOk: boolean; xaiOk: boolean } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Key present only. Health never calls Anthropic (every call there costs money). */
function anthropicConfigured(): boolean {
  const key = process.env.ANTHROPIC_API_KEY;
  return Boolean(key && key.length >= 20);
}

/** Same binary lib/render.ts uses: bin/ffmpeg exists, is executable, and answers -version. */
function checkFfmpeg(timeoutMs = 3000): Promise<boolean> {
  const bin = path.join(process.cwd(), "bin", "ffmpeg");
  try {
    if (!existsSync(bin)) return Promise.resolve(false);
    accessSync(bin, constants.X_OK);
  } catch {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    execFile(bin, ["-hide_banner", "-version"], { timeout: timeoutMs }, (err, stdout) => {
      resolve(!err && String(stdout).includes("ffmpeg version"));
    });
  });
}

/** Free call: listing models is not billed. Short timeout so health stays fast. */
async function checkXai(): Promise<boolean> {
  const key = process.env.XAI_API_KEY;
  if (!key || key.length < 20) return false;
  try {
    const res = await fetch("https://api.x.ai/v1/models", {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const now = Date.now();
    const cached = cachedHealth && now - cachedHealth.timestamp < CACHE_TTL_MS ? cachedHealth : null;
    const [dbOk, ffmpegOk, xaiOk] = await Promise.all([
      pingTable().catch(() => false),
      cached ? cached.ffmpegOk : checkFfmpeg(),
      cached ? cached.xaiOk : checkXai(),
    ]);
    if (!cached) cachedHealth = { timestamp: now, ffmpegOk, xaiOk };

    const anthropic = anthropicConfigured();
    return NextResponse.json({
      ok: dbOk,
      product: "PersonalContentBot",
      jobs: dbOk ? "up" : "down",
      engines: { ffmpeg: ffmpegOk, xai: xaiOk },
      // Cixy is available when the shared Anthropic key is configured (not a live round-trip).
      cixy: anthropic,
      anthropicKeyConfigured: anthropic,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

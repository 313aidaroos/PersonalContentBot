import { NextResponse } from "next/server";
import { pingTable } from "@/lib/db";

export const dynamic = "force-dynamic";

// Cached status (5min TTL per Awad's requirement)
let cachedHealth: { timestamp: number; cixyOk: boolean; xaiOk: boolean } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function checkCixy(): Promise<boolean> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.length < 20) return false;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 10,
        messages: [{ role: "user", content: "ping" }],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function checkXai(): Promise<boolean> {
  const key = process.env.XAI_API_KEY;
  if (!key || key.length < 20) return false;
  try {
    // Real round-trip: list models endpoint
    const res = await fetch("https://api.x.ai/v1/models", {
      headers: { authorization: `Bearer ${key}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const dbOk = await pingTable();

    // Use cache if fresh
    const now = Date.now();
    if (cachedHealth && now - cachedHealth.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        ok: dbOk,
        product: "PersonalContentBot",
        jobs: dbOk ? "up" : "down",
        engines: {
          ffmpeg: true,
          xai: cachedHealth.xaiOk,
        },
        cixy: cachedHealth.cixyOk,
      });
    }

    // Refresh cache with real round-trips
    const [cixyOk, xaiOk] = await Promise.all([checkCixy(), checkXai()]);
    cachedHealth = { timestamp: now, cixyOk, xaiOk };

    return NextResponse.json({
      ok: dbOk,
      product: "PersonalContentBot",
      jobs: dbOk ? "up" : "down",
      engines: { ffmpeg: true, xai: xaiOk },
      cixy: cixyOk,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

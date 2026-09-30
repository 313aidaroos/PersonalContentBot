// Change note (Claude, Sep 2026): Rate limited. Retired model replaced (ANTHROPIC_MODEL or claude-sonnet-5). See docs/LAUNCH_NOTES.md.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
// Shared Apixis Cixy character + PersonalContentBot expert role (single source for this repo).
import { CIXY_SYSTEM_PROMPT } from "@/lib/cixy-persona";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Public widget that spends Anthropic credits: cap input and rate per IP (per instance —
// a speed bump against scripted abuse, not a global quota).
const MAX_CHARS = 2000;
const hits = new Map<string, number[]>();
function rateLimited(ip: string, max = 20, windowMs = 10 * 60 * 1000, now = Date.now()) {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > max;
}

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI service not configured. 503 Service Unavailable." },
      { status: 503 }
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many messages. Please wait a few minutes." }, { status: 429 });
  }

  try {
    const body = (await req.json()) as { messages?: unknown };
    // Only well-formed turns, last 10, each capped; the conversation must end with the user.
    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter(
        (m): m is { role: "user" | "assistant"; content: string } =>
          !!m &&
          typeof m === "object" &&
          ((m as { role?: unknown }).role === "user" || (m as { role?: unknown }).role === "assistant") &&
          typeof (m as { content?: unknown }).content === "string",
      )
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

    if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
        max_tokens: 1024,
        system: CIXY_SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Anthropic API error:", response.status, error.slice(0, 200));
      // Out of credit, rate limited or down: a calm sentence, never the vendor's error.
      const fallback = cixyUnavailableReply(response.status);
      return NextResponse.json({ error: fallback.reply, reply: fallback.reply, code: "cixy_unavailable" }, { status: fallback.status });
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      error?: { type: string; message: string };
    };

    if (data.error) {
      return NextResponse.json(
        { error: data.error.message },
        { status: 400 }
      );
    }

    const textContent = data.content?.find((c) => c.type === "text")?.text || "";
    return NextResponse.json({ reply: textContent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat failed";
    console.error("Cixy chat error:", message);
    const fallback = cixyUnavailableReply(null);
    return NextResponse.json({ error: fallback.reply, reply: fallback.reply, code: "cixy_unavailable" }, { status: fallback.status });
  }
}

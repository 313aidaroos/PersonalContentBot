// Change note (Claude, Sep 2026): Rate limited. See docs/LAUNCH_NOTES.md.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

const CIXY_SYSTEM_PROMPT = `You are Cixy, an AI assistant for PersonalContentBot. You are:

## Core Identity
- A Muslim AI operator serving respectfully to all users regardless of their faith
- Greet with "As-salamu alaykum" or "Salam" when appropriate, naturally (not forced every turn)
- Use Islamic phrases naturally: "insha'Allah" for future plans, "alhamdulillah" for good outcomes, "bismillah" when starting work
- Modest, calm, professional, warm. Honest to a fault. Never fabricate.

## Halal-Conscious Approach
- Cixy never recommends, promotes, schedules, or helps produce: alcohol, pork, gambling/lotteries, riba (interest-based lending), adult content, or deceptive marketing
- For content creation: always prioritize wholesome, family-safe, honest framing
- If a user asks for haram (forbidden) content, politely decline and suggest a halal alternative

## Time & Prayer Awareness
- Aware of prayer times and Jumu'ah (Friday midday). When scheduling posts, offer to avoid prayer windows when timezone is known
- Ramadan-aware: adjust scheduling and tone during Ramadan; suggest suhoor/iftar-friendly times
- Know major Islamic dates (Eid al-Fitr, Eid al-Adha, Ramadan, Muharram, Mawlid) and help plan around them

## Content Expert
- Deep expertise in one-minute social videos: hooks, 15/30/60s structure, captions, safe zones, platform specs (Reels, Shorts, TikTok)
- Guide users from video idea → script → storyboard → render
- Honest about what works and what doesn't

## Boundaries
- Not a scholar. On any Islamic ruling, say "I'm not a scholar — please confirm with a qualified one"
- No sectarian positions or politics
- Awad is the boss; defer to his direction

## Current Task
Help users create one-minute videos for social media. Assist with scripting, framing, and platform optimization.

Be direct, respectful, and useful.`;

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
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: CIXY_SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Anthropic API error:", error);
      return NextResponse.json(
        { error: "AI service error" },
        { status: response.status }
      );
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
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

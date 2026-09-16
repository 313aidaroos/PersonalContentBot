import type { Beat, Orientation, VideoScript } from "./types";

function clampLine(s: string, n = 42) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

function beatsFor(idea: string, niche: string | null): Omit<Beat, "start" | "end">[] {
  const subject = idea.trim().replace(/[.?!]+$/, "");
  const lane = niche?.trim() || "short-form";
  return [
    {
      onScreen: clampLine(subject),
      voiceover: `Stop scrolling. ${subject}.`,
      visual: `Tight 9:16 open on the subject. High contrast. No logo bumper.`,
    },
    {
      onScreen: "One idea. Sixty seconds.",
      voiceover: `Here is the only point that matters about ${subject}.`,
      visual: `Hold the face or product in the upper 60%. Big type, center.`,
    },
    {
      onScreen: clampLine(`Why ${lane} cares`),
      voiceover: `If you make ${lane} content, this is the part people skip — and the part that actually converts.`,
      visual: `Cut on the verb. Overlay 3–5 words max.`,
    },
    {
      onScreen: "Do this next",
      voiceover: `Show the move, not the lecture. One action. Then the result.`,
      visual: `Hands or UI in frame. Caption sits above the lower-third safe zone.`,
    },
    {
      onScreen: "The mistake",
      voiceover: `Most people bury the hook at second eight. You already spent it.`,
      visual: `Flash the wrong way, then the right way. Same shot, different type.`,
    },
    {
      onScreen: "Loop it",
      voiceover: `End on the first frame energy so the replay feels accidental.`,
      visual: `Return to the open composition. CTA in type, not a spoken essay.`,
    },
  ];
}

function timed(parts: Omit<Beat, "start" | "end">[]): { hook: Beat; beats: Beat[]; cta: Beat } {
  const windows = [
    [0, 2],
    [2, 12],
    [12, 25],
    [25, 40],
    [40, 52],
    [52, 60],
  ] as const;
  const timedBeats = parts.map((p, i) => ({
    ...p,
    start: windows[i][0],
    end: windows[i][1],
  }));
  const hook = timedBeats[0];
  const cta = timedBeats[timedBeats.length - 1];
  return { hook, beats: timedBeats.slice(1, -1), cta };
}

function toVtt(script: Omit<VideoScript, "captionsVtt">): string {
  const all = [script.hook, ...script.beats, script.cta];
  const cue = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `00:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.000`;
  };
  const body = all
    .map((b, i) => `${i + 1}\n${cue(b.start)} --> ${cue(b.end)}\n${b.onScreen}`)
    .join("\n\n");
  return `WEBVTT\n\n${body}\n`;
}

export function buildTemplateScript(idea: string, niche: string | null, orientation: Orientation): VideoScript {
  const { hook, beats, cta } = timed(beatsFor(idea, niche));
  const title = clampLine(idea, 56);
  const base: Omit<VideoScript, "captionsVtt"> = {
    title,
    hook,
    beats,
    cta,
    hashtags: ["#shorts", "#reels", "#fyp", niche ? `#${niche.replace(/\s+/g, "")}` : "#creator"].slice(0, 4),
  };
  if (orientation === "horizontal") {
    hook.visual += " Letterbox only if you must; prefer a crop, not 16:9 talking-head dead space.";
  }
  return { ...base, captionsVtt: toVtt(base) };
}

type LlmBeat = { start: number; end: number; onScreen: string; voiceover: string; visual: string };

function isBeat(x: unknown): x is LlmBeat {
  if (!x || typeof x !== "object") return false;
  const b = x as Record<string, unknown>;
  return (
    typeof b.start === "number" &&
    typeof b.end === "number" &&
    typeof b.onScreen === "string" &&
    typeof b.voiceover === "string" &&
    typeof b.visual === "string"
  );
}

export async function generateScript(
  idea: string,
  niche: string | null,
  orientation: Orientation,
): Promise<VideoScript> {
  const fallback = buildTemplateScript(idea, niche, orientation);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return fallback;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1600,
        messages: [
          {
            role: "user",
            content: `Write a 60-second vertical social video script as JSON only (no markdown).
Idea: ${idea}
Niche: ${niche || "general"}
Orientation: ${orientation}
Rules: hook in first 2 seconds; one idea; end on a loop or CTA; captions 3-7 words; faces in upper 60%; captions above lower-third.
Shape:
{"title":string,"hook":{"start":0,"end":2,"onScreen":string,"voiceover":string,"visual":string},"beats":[{"start":number,"end":number,"onScreen":string,"voiceover":string,"visual":string}],"cta":{"start":52,"end":60,"onScreen":string,"voiceover":string,"visual":string},"hashtags":[string]}
Beats should cover 2-52 seconds without gaps.`,
          },
        ],
      }),
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((c) => c.type === "text")?.text || "";
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd < 0) return fallback;
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>;
    if (!isBeat(parsed.hook) || !isBeat(parsed.cta) || !Array.isArray(parsed.beats) || !parsed.beats.every(isBeat)) {
      return fallback;
    }
    const base: Omit<VideoScript, "captionsVtt"> = {
      title: typeof parsed.title === "string" ? parsed.title : fallback.title,
      hook: parsed.hook,
      beats: parsed.beats,
      cta: parsed.cta,
      hashtags: Array.isArray(parsed.hashtags)
        ? parsed.hashtags.filter((h): h is string => typeof h === "string").slice(0, 6)
        : fallback.hashtags,
    };
    return { ...base, captionsVtt: toVtt(base) };
  } catch {
    return fallback;
  }
}

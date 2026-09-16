import { ImageResponse } from "next/og";
import type { Beat } from "./types";

function wrap(text: string, size: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > size && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}

export async function renderBeatPng(opts: {
  beat: Beat;
  index: number;
  total: number;
  width: number;
  height: number;
  idea: string;
}): Promise<Buffer> {
  const caption = wrap(opts.beat.onScreen, opts.width > opts.height ? 28 : 16);
  const visual = wrap(opts.beat.visual, 42).slice(0, 2);
  const res = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#070708",
          color: "#f4efe6",
          padding: opts.height > opts.width ? 72 : 56,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#9a9388" }}>
          <span>PersonalContentBot</span>
          <span>
            {opts.beat.start}s · {opts.index + 1}/{opts.total}
          </span>
        </div>
        <div
          style={{
            marginTop: 24,
            height: 8,
            width: "100%",
            background: "#2a2723",
            display: "flex",
            borderRadius: 99,
          }}
        >
          <div
            style={{
              height: 8,
              width: `${Math.round(((opts.index + 1) / opts.total) * 100)}%`,
              background: "#ff5a2a",
              borderRadius: 99,
            }}
          />
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {caption.map((line) => (
            <div
              key={line}
              style={{
                fontSize: opts.height > opts.width ? 72 : 64,
                fontWeight: 800,
                letterSpacing: -2,
                lineHeight: 1.1,
                display: "flex",
              }}
            >
              {line}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", color: "#9a9388", fontSize: 28 }}>
          {visual.map((line) => (
            <div key={line} style={{ display: "flex" }}>
              {line}
            </div>
          ))}
          <div style={{ marginTop: 16, color: "#ff5a2a", display: "flex" }}>{opts.idea.slice(0, 80)}</div>
        </div>
      </div>
    ),
    { width: opts.width, height: opts.height },
  );
  return Buffer.from(await res.arrayBuffer());
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { generateMagicToken, sendMagicLink } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const token = generateMagicToken(email);
    const origin = req.headers.get("origin") || "https://personalcontentbot.vercel.app";
    await sendMagicLink(email, token, origin);

    return NextResponse.json({ message: "Magic link sent. Check your email." });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send magic link" },
      { status }
    );
  }
}

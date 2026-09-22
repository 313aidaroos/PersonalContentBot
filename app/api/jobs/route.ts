import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { listJobs } from "@/lib/db";
import { queueAndRunWithPayment } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  try {
    const jobs = await listJobs();
    return NextResponse.json({ jobs });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  // Auth check BEFORE reading body (money route safety rule)
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authentication required. Please log in." },
      { status: 401 }
    );
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Service configuration error" },
      { status: 503 }
    );
  }

  // Verify session and get user email
  const token = authHeader.replace("Bearer ", "");
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      authorization: authHeader,
      apikey: supabaseAnonKey,
    },
  });

  if (!userRes.ok) {
    return NextResponse.json(
      { error: "Invalid or expired session. Please log in again." },
      { status: 401 }
    );
  }

  const user = (await userRes.json()) as { email?: string };
  if (!user.email) {
    return NextResponse.json(
      { error: "Email not verified. Please verify your email." },
      { status: 403 }
    );
  }

  // Now safe to read body
  try {
    const body = (await req.json()) as {
      idea?: string;
      niche?: string;
      orientation?: "vertical" | "horizontal";
    };

    const job = await queueAndRunWithPayment({
      idea: body.idea || "",
      niche: body.niche,
      orientation: body.orientation,
      ownerEmail: user.email,
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    let status = 500;
    if (message.includes("too short") || message.includes("too long")) status = 400;
    if (message.includes("Not enough Ixis")) status = 402;
    return NextResponse.json({ error: message }, { status });
  }
}

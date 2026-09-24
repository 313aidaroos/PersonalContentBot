import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { listJobs } from "@/lib/db";
import { queueAndRunWithPayment } from "@/lib/pipeline";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Authentication required. Please log in." }, { status: 401 });
  try {
    const jobs = await listJobs(user.email);
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
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user || !user.email) {
    return NextResponse.json(
      { error: "Authentication required. Please log in." },
      { status: 401 }
    );
  }

  // Now safe to read body
  try {
    const body = (await req.json()) as {
      idea?: string;
      niche?: string;
      orientation?: "vertical" | "horizontal";
      attemptId?: string;
    };

    if (!body.attemptId || body.attemptId.length < 10 || body.attemptId.length > 50) {
      return NextResponse.json(
        { error: "attemptId required (10-50 chars, stable per button click)" },
        { status: 400 }
      );
    }

    const job = await queueAndRunWithPayment({
      idea: body.idea || "",
      niche: body.niche,
      orientation: body.orientation,
      ownerEmail: user.email,
      attemptId: body.attemptId,
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

import { NextResponse } from "next/server";
import { listJobs } from "@/lib/db";
import { queueAndRun } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      idea?: string;
      niche?: string;
      orientation?: "vertical" | "horizontal";
    };
    const job = await queueAndRun({
      idea: body.idea || "",
      niche: body.niche,
      orientation: body.orientation,
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("too short") || message.includes("too long") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

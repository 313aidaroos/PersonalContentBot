import { NextResponse } from "next/server";
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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      idea?: string;
      niche?: string;
      orientation?: "vertical" | "horizontal";
      userToken?: string;
    };
    
    const userToken = req.headers.get("authorization")?.replace("Bearer ", "") || body.userToken;
    if (!userToken) {
      return NextResponse.json(
        { error: "Authentication required. Please log in." },
        { status: 401 }
      );
    }

    const job = await queueAndRunWithPayment({
      idea: body.idea || "",
      niche: body.niche,
      orientation: body.orientation,
      userToken,
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    let status = 500;
    if (message.includes("too short") || message.includes("too long")) status = 400;
    if (message.includes("Insufficient Ixis")) status = 402;
    if (message.includes("Authentication required")) status = 401;
    return NextResponse.json({ error: message }, { status });
  }
}

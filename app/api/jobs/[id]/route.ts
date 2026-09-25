// Change note (Claude, Sep 2026): Sign-in required; reads only your job. See docs/LAUNCH_NOTES.md.
import { NextResponse } from "next/server";
import { getJob } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Authentication required. Please log in." }, { status: 401 });
  try {
    const { id } = await ctx.params;
    // Filtered by owner: another member's job id reads as not found.
    const job = await getJob(id, user.email);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    return NextResponse.json({ job });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

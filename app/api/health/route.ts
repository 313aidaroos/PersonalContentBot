import { NextResponse } from "next/server";
import { pingTable } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ok = await pingTable();
    return NextResponse.json({ ok, product: "PersonalContentBot", jobs: ok ? "up" : "down" });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

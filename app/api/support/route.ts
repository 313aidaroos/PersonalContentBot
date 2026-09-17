import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPPORT_EMAIL = "contentbot@apixis.dev";
const OWNER_EMAIL = "awad@apixis.dev";

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message, priority } = (await req.json()) as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
      priority?: "low" | "medium" | "high";
    };

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, subject, message" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Support intake is not configured." }, { status: 503 });
    }
    const ticket = {
      name,
      email,
      subject,
      message,
      priority: priority || "medium",
      status: "open",
      intake_address: SUPPORT_EMAIL,
      route_to: OWNER_EMAIL,
    };

    const res = await fetch(`${supabaseUrl}/rest/v1/${process.env.PCB_SUPPORT_TABLE || "pcb_support_tickets"}`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(ticket),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Support request could not be saved." }, { status: 502 });
    }
    const [saved] = (await res.json()) as Array<{ id: string }>;

    return NextResponse.json(
      {
        ticket_id: saved.id,
        message: "Support request received. We'll get back to you shortly.",
        routed_to: OWNER_EMAIL,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Support request failed" },
      { status: 500 }
    );
  }
}

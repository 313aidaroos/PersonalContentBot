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

    // Store ticket in DB (would use Supabase)
    const ticket = {
      id: `tk_${Date.now()}`,
      name,
      email,
      subject,
      message,
      priority: priority || "medium",
      created_at: new Date().toISOString(),
      status: "open",
    };

    console.log(`[SUPPORT] New ticket: ${ticket.id} from ${email}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Priority: ${priority || "medium"}`);
    console.log(`  Routing: ${SUPPORT_EMAIL} → ${OWNER_EMAIL}`);

    // In production:
    // 1. Save ticket to DB
    // 2. Email SUPPORT_EMAIL → OWNER_EMAIL with ticket details
    // 3. Send confirmation to user

    return NextResponse.json(
      {
        ticket_id: ticket.id,
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

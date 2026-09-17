import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyMagicToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      return NextResponse.json({ error: "Missing token or email" }, { status: 400 });
    }

    if (!verifyMagicToken(token, email)) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // Set session cookie
    const response = NextResponse.redirect(new URL("/", req.url));
    response.cookies.set("auth_email", email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 500 }
    );
  }
}

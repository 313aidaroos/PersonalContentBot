import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  
  // Same-origin only
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // Fallback: redirect to auth with error
  return NextResponse.redirect(`${origin}/auth?error=auth_failed`);
}

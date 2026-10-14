// Apixis world agent for the signed-in person (2026-10-14, Content Bot Lead, Grok).
// Uses the shared kit lib/apixis-world-provision.ts unchanged. Off (returns ready:false) until
// APIXIS_WORLD_KEY is set on Vercel. Called once per browser by components/ApixisWorldLink.tsx;
// the per-user flag app_metadata.apixis_world_agent_at makes later calls skip Apixis.dev.
import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { apixisSubOf } from "@/lib/apixis-login";
import { provisionApixisWorldAgent } from "@/lib/apixis-world-provision";
import { enterApixisUrl } from "@/lib/apixis-world";

export const dynamic = "force-dynamic";

const CLIENT = "contentbot";

export async function POST() {
  const enterUrl = enterApixisUrl(CLIENT);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ ready: false, enterUrl }, { status: 401 });

  if (user.app_metadata?.apixis_world_agent_at) return NextResponse.json({ ready: true, enterUrl });

  // Only Apixis ID accounts (email verified by the Wallet) get an agent from here.
  const sub = apixisSubOf(user);
  if (!sub) return NextResponse.json({ ready: false, enterUrl });

  const result = await provisionApixisWorldAgent({ client: CLIENT, email: user.email, emailVerified: true, apixisSub: sub });
  if (!result.ok) {
    if (result.error !== "apixis_world_key_missing") console.warn("world agent provision failed:", result.error, result.status ?? "");
    return NextResponse.json({ ready: false, enterUrl });
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (url && service) {
    const admin = createAdmin(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    await admin.auth.admin
      .updateUserById(user.id, {
        app_metadata: {
          ...user.app_metadata,
          apixis_world_agent_at: new Date().toISOString(),
          apixis_world_agent_id: result.agent?.id ?? null,
        },
      })
      .catch(() => undefined); // Apixis.dev is idempotent; a missed flag only means one extra call later.
  }
  return NextResponse.json({ ready: true, created: result.created, enterUrl: result.enterUrl || enterUrl });
}

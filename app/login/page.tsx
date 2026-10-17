import { redirect } from "next/navigation";

/**
 * /login is not a page here: sign-in lives at /auth. The shared Apixis login kit
 * (lib/apixis-login.ts, a copy of ApixisWallet/sdk/apixis-login-next.ts) sends failed sign-ins to
 * /login?error=…, so forward them to /auth and keep the query. Added 2026-10-14 (Content Bot Lead, Grok).
 */
export default async function LoginRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) {
    if (typeof v === "string") params.set(k, v);
  }
  const qs = params.toString();
  redirect(qs ? `/auth?${qs}` : "/auth");
}

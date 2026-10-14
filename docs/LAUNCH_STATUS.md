# PersonalContentBot: launch status (target Jan 1, 2027; beta live now)

Written 2026-10-14 4:15 PM CT by Content Bot Lead (Grok), from main @ 4aa7740 (last code: #17 820a000).
Checks on main: `npm ci`, `npx tsc --noEmit`, `npm run build`, `npx jest` (4 suites, 15 tests) all pass.

## Done (with evidence)
| Item | Evidence |
|---|---|
| Ixis billing for clips: hold 800 for `contentbot.clip`, capture on delivery, release on failure; free clip on template fallback | `lib/pipeline.ts` (`redeem()` + `DeliveredWithoutCharge`), `lib/apixis-wallet.ts` (kit copy), `tests/pipeline-billing.test.ts` |
| Balance pill + Buy Ixis link | `components/ApixisWalletChip.tsx`, `app/api/wallet/balance/route.ts`, `app/layout.tsx` |
| Apixis ID sign-in; new accounts only through Apixis ID | `app/auth/apixis/{start,callback}`, `lib/apixis-login.ts`, `app/auth/actions.ts` (`shouldCreateUser: false`), PR #17 |
| "A Apixis Company" badge | `app/layout.tsx` |
| Shared Cixy persona v2, no religious content | `lib/apixis-cixy.ts`, `lib/cixy-persona.ts`, `tests/cleanup.test.ts` |
| Jobs scoped to owner | `lib/db.ts`, `tests/job-ownership.test.ts` |
| Cheap health check | `app/api/health/route.ts` |
| Durable jobs code (gated by `PCB_DURABLE_JOBS`, off) | `lib/db.ts`, `app/api/cron/reconcile-jobs/route.ts`, `supabase/pcb_jobs_durable.sql` (NOT run) |
| Pricing page (Ixis) | `app/pricing/page.tsx`, `lib/pricing.ts` |
| Support form | `app/support/page.tsx`, `app/api/support/route.ts`, `supabase/pcb_support_tickets.sql` |
| CI | `.github/workflows/ci.yml` |

## Not done (code work)
| Item | State |
|---|---|
| Bug fixes: hard-coded `pcb_jobs` in pipeline cleanup, hard-coded Buy Ixis return URL, raw Supabase/provider errors to the browser (auth actions, jobs, support, cixy), unused `resend`, two env examples, wrong hub ref in SQL header, Apixis login errors land on /login (404) | Fixed on branch `grok/launch-bugfixes-20261014` (PR a) |
| "Other Ixis companies" footer | Built on branch `grok/ixis-footer-20261014` (PR b). Canonical list = `Apixis.dev/js/ixis-companies.js`; Recovra (`recovra-three.vercel.app`) returned 404 on 10/14, so it's left out |
| Apixis world agent + `apixis.dev/enter?from=contentbot` link | Built on branch `grok/world-agent-20261014` (PR c), using the `Apixis.dev/sdk/apixis-world-provision.ts` kit unchanged. Live `/api/agent/provision` answers (405 on GET); `contentbot` is on the allow-list in `docs/PROVISION_KIT.md`. Off until `APIXIS_WORLD_KEY` is set |
| Card (Stripe) or Ixis checkout + Billing/history page | NOT started. Conflicts with this repo's own rule (`docs/APIXIS_FAMILY.md` rule 1: "never runs its own Stripe checkout") and the Wallet's "one checkout" model (`ApixisWallet/docs/COMMERCE.md`: card buys go through Wallet `/buy`). The Wallet `sdk/` has no product-side Stripe kit to reuse (only Socixis' own `socixis-app/src/lib/billing/stripe-checkout.ts`). It also needs a webhook, a ledger table (DB write) and Stripe price env vars. Needs Awad's call (see below) |
| Socixis Social feed tab | NOT started. Backend not live: `https://www.apixis.dev/api/feed` and `/api/feed/posts` return 404 (10/14 4:05 PM CT) |
| Clips have no audio | Open: `lib/render.ts` says "Silent". Needs a voice/music source decision |
| Render runs inline (no queue) | Open: `app/api/jobs/route.ts` `maxDuration = 300`; a queue needs infra (Redis/Supabase queue) |
| Durable jobs live | Code ready; needs the SQL run on the hub and `PCB_DURABLE_JOBS=true` |

## Needs Awad
1. Card payments: allow ContentBot to run its own Stripe Checkout (on the Apixis Dev LLC account), or keep the family rule that cards go only through Apixis Wallet `/buy`? If yes, Stripe price IDs per product/tier and a ledger table approval.
2. Run `supabase/pcb_jobs_durable.sql` on hub `myfclypikkcvfurkbzmj`, then set `PCB_DURABLE_JOBS=true`.
3. Mint `APIXIS_WORLD_KEY` for `contentbot` (put its SHA-256 in apixis-dev `APIXIS_WORLD_KEYS`) and set it on Vercel `personalcontentbot`.
4. Creator Seat covering clips; Socixis handoff shape; final card prices beyond 100 Ixis = $1; overlap with Socixis video; audio for clips.
5. Recovra's live host (the canonical list's URL 404s).
6. GitHub write access for the box (gh token is invalid; see PR notes).

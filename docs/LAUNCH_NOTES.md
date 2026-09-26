# PersonalContentBot: launch notes

_Updated 2026-09-25. One notes file per repo: what was changed, file by file, and everything you need to connect. The full family report: https://claude.ai/artifact/QERxA6PMsFK1vdR51Ex2NQ_

## Status

Ready after keys.

## Connect (in order)

1. **Apixis Wallet key.** In the ApixisWallet repo run `npm run family-keys` once. It prints one SQL block (paste it in the Wallet's Supabase SQL editor) and one env block per site. Paste this site's block: `WALLET_API_KEY`, `APIXIS_CLIENT_ID`, `APIXIS_WALLET_API_URL`.
2. Supabase (hub): see `env.example`.
3. AI: `ANTHROPIC_API_KEY` (scripts), `XAI_API_KEY` (video).

Every key this repo reads is listed in `env.example` (required, optional, and legacy names to leave unset).

## Apixis Wallet

App `contentbot`. Sells `contentbot.*` (clip, text, image, adset, creator seat).

## Database

`supabase/pcb_jobs_owner.sql` applied live (2026-09-24). Jobs made before that have no owner and are hidden.

## What changed, file by file

Each changed backend code file also starts with a one-line `Change note (Claude, Sep 2026)` comment saying the same thing.

| File | Change |
|---|---|
| `.gitignore` | Part of: Launch notes + complete .env.example (backend/plumbing only). |
| `app/api/cixy/route.ts` | Rate limited; retired model replaced (ANTHROPIC_MODEL or claude-sonnet-5). |
| `app/api/health/route.ts` | Part of: Replace the retired Claude model so Cixy doesn't fail. |
| `app/api/jobs/[id]/route.ts` | Sign-in required; reads only your job. |
| `app/api/jobs/route.ts` | Sign-in required; lists only your jobs. |
| `docs/LAUNCH_NOTES.md` | This file. |
| `env.example` | Added 8 key(s) the code reads that were missing: `WALLET_API_KEY`, `NEXT_PUBLIC_APP_URL`, `PCB_SUPPORT_TABLE`, `XAI_VIDEO_TIMEOUT_MS`, `ANTHROPIC_MODEL`, `SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN`, `APIXIS_WALLET_API_KEY`. |
| `lib/db.ts` | Every job read/write is scoped to `owner_email`. |
| `lib/pipeline.ts` | Removed `queueAndRun` (unpaid path that skipped the Wallet). |
| `supabase/pcb_jobs_owner.sql` | New. Adds `owner_email` + index (applied). |
| `tests/rules.test.ts` | Fixed an import. |
| `tsconfig.tsbuildinfo` | Build cache. Untracked today and added to .gitignore. |

_Changes are backend and plumbing only. Pages, design and UI are not changed except where noted as a build or lint fix with no visual change._

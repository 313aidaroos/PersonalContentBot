# Claude notes (PersonalContentBot)

Dated notes from Claude (Claude Code), same purpose as `NOTES/GROK.md`: what Claude checked or changed here, what it found, what is still open and who owns it. The one family status board is `ApixisWallet/docs/FAMILY_STATUS.md`.

## 2026-10-04 (UTC) — Claude: full-portfolio review (read-only; this note and the AI_CHANGELOG line are the only changes)

### Snapshot
- `main` @ `5ae3997` (notes backfill; code unchanged since 10-02). Vercel `personalcontentbot` production READY on it.
- Data on the HUB Supabase project `myfclypikkcvfurkbzmj`: `public.pcb_jobs` 10 rows, `public.pcb_support_tickets` 15 rows. `pcb_jobs_owner` is tracked (09-24); **`supabase/pcb_jobs_durable.sql` is NOT applied** (so `PCB_DURABLE_JOBS` must stay unset). `CRON_SECRET` set on Vercel 10-02.

### Verified this session
- `npm run typecheck`, `npm test` (jest, 5 files), `npm run build`: all pass on Node 22. `postinstall` downloads an ffmpeg binary (network) — worked here.
- `vercel.json` sets `maxDuration: 300` on `app/api/jobs/route.ts` — that needs a Vercel plan that allows 300 s functions (Hobby caps at 60 s and renders would time out). Confirm the plan.
- SDK copies identical to canonical (wallet, login, redirect, cixy).
- Two env example files exist and differ: `.env.example` and `env.example`; README tells people to copy `env.example`.
- Hub advisors: `pcb_jobs` / `pcb_support_tickets` RLS on with no policies (service-role only, intended).

### Done (live)
Sign-in (magic link, password, Apixis ID), Cixy (short-form video expert on the shared core), idea → job pipeline (queued → scripting → rendering → ready), real silent MP4 via ffmpeg (+ optional xAI hero clip), pricing page, Wallet redeem per clip (`contentbot.clip` 800 Ixis: reserve → render → capture, release on failure), durable jobs + reconcile cron behind `PCB_DURABLE_JOBS`, billing-identity vs job-owner split, support, CI.

### Open — needs Awad
- Run `supabase/pcb_jobs_durable.sql` on the hub (SQL editor or the launch kit), then set `PCB_DURABLE_JOBS=true` on Vercel and redeploy — this is what makes a retried click charge once.
- Confirm the Vercel plan supports 300 s functions.
- `XAI_API_KEY` is optional (slides-only fallback works without it).

### Open — Claude can do on your go
- Merge `.env.example` and `env.example` into one; fix the README copy line.
- `supabase/pcb_jobs_durable.sql` header names a hub ref that does not exist (`myfclypikkcvfurrlsko`; the hub is `myfclypikkcvfurkbzmj`).
- Check whether `contentbot.creator.monthly`, `contentbot.text`, `contentbot.image`, `contentbot.adset` (in the Wallet catalog) are reachable from the UI; today the app redeems clips.

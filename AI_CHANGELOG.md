# AI Change Log

## Rules for AI models, bots, and agents

If you are an AI (Claude, ChatGPT, Grok, Gemini, Copilot, Cursor, JunoAI, or any other model, bot, or agent) and you add, modify, or delete anything in this repository, you **must** append a dated entry to this file describing what you changed and why — one entry per work session, no exceptions. This log is how the repository owner tracks what every AI did. Human commits do not need entries.

Entry format:

## YYYY-MM-DD — <your name/model>
- Changed: <files or area>
- Why: <reason>

---

## 2026-09-28 — JunoAI
- Changed: created this file
- Why: owner's standing rule — every AI that touches this repo must log its changes here

## 2026-09-28 — JunoAI
- Changed: Added .github/workflows/ci.yml — thin caller of the shared reusable workflow 313aidaroos/github-actions/.github/workflows/node-ci.yml@main (checkout → Node 20 → npm ci → lint/typecheck/test/build).
- Why: Standardize CI across repos via the shared reusable workflow.


## 2026-09-30 — Codex — Tester readiness: shared-login redirects

- Copied the canonical ApixisWallet local-redirect validator and used it at login start and callback. Preserved this app’s existing Supabase adapter and routes.
- Added regression cases for external URLs, backslashes, encoded separators/control characters and normal return destinations. No design changes.

## 2026-09-30 — Codex — Tester readiness: job ownership

- Separated billing identity (Apixis subject) from local job ownership (verified session email). New SSO jobs remain visible in their owner's history.
- Added ownership-scoped compatibility reads for jobs previously saved under the trusted Apixis subject, without rewriting customer records or accepting an owner from the browser.
- Added pipeline/ownership regressions. Database URL now accepts the standard NEXT_PUBLIC_SUPABASE_URL fallback on the server.

## 2026-09-30 — Claude (branch claude/awesome-newton-3tygzi)
- Changed: `lib/apixis-login.ts` re-copied (`type: "email"`, D16). `lib/apixis-wallet.ts` → SDK v3.1.
- Why: family backend pass per Awad's 2026-09-30 decisions (ApixisWallet/AGENTS.md §0c D11–D16; live board: ApixisWallet/docs/FAMILY_STATUS.md). One SDK, one login kit, one world kit — copied from canonical, never patched by hand.

## 2026-09-30 (night pass) — Claude
- Changed: Cixy prompt now starts with the shared family core from `lib/apixis-cixy` (copied from `ApixisWallet/sdk/apixis-cixy`); only the product role stays site-specific. Greeting policy is the family rule (match the person, never open with salaam). Provider failures (no key, out of credit, 429, 5xx) answer `cixyUnavailableReply()` — a calm sentence with HTTP 503/429, never the vendor error. `lib/cixy-persona.ts` keeps only the family facts and the PersonalContentBot role.
- Why: Awad's overnight instruction — all backend and security done, one Cixy persona everywhere (ApixisWallet/docs/CIXY.md, sdk/apixis-cixy.*), agents on the same page (ApixisWallet/docs/FAMILY_STATUS.md).

## 2026-09-30 (night pass 2) — Claude
- Changed: durable jobs — `lib/db.ts` (`findJobByAttempt`, `listStuckJobs`, durable columns behind `PCB_DURABLE_JOBS=true`), `lib/pipeline.ts` (a retried click returns the existing job instead of rendering and charging twice; the Wallet hold and receipt are recorded on the job), `app/api/cron/reconcile-jobs` (every 10 min: renders stuck >15 min → hold released, job failed; captured-but-unfinished flagged for support, never refunded silently), `vercel.json` cron, `supabase/pcb_jobs_durable.sql` (Awad runs it on the hub project, then sets `PCB_DURABLE_JOBS=true` and `CRON_SECRET`).
- Fixed: `app/api/cixy/route.ts` was missing the `cixyUnavailableReply` import (would have failed the build) — caught because this repo had no `typecheck`/`test` scripts, so the shared CI ran nothing. Added `typecheck` and `test` scripts; tests updated for the shared persona and the durable path (15 pass, tsc clean).
- Why: Awad's overnight instruction — everything functional and ready for keys; a lost response must never double-charge.

## 2026-10-02 — Claude (Claude Code)
- Changed: `.env.example` now lists every env var the code reads (missing names appended with a one-line note each; file created).
- Why: so the owner can add keys in Vercel from one complete list. No code changed.

## 2026-10-04 — Claude (Claude Code, full-portfolio review)
- Changed: `NOTES/CLAUDE.md` — this repo's slice of the 24-repo review (what is live, what is open, who owns each item, drift found). No code, env, database or deploy changes.
- Why: Awad asked for every repo to be read twice with a done / to-do / owner status, and for the notes in each repo to be updated. Notes only; Awad approved the merge on 2026-10-04.

## 2026-10-04 — Grok (Content Bot Lead, Claude-review pass)
- Changed: `lib/apixis-cixy.ts` — removed religious greeting/phrase/ruling lines from the shared Cixy core (Awad's lock: no religious content outside Halaxis); Cixy keeps warm hospitality and neutral greetings. `tests/cleanup.test.ts` asserts no religious terms in the Cixy prompt. Notes in `NOTES/GROK.md`.
- Why: lock check of Claude's recent work. The canonical `ApixisWallet/sdk/apixis-cixy.ts` needs the same fix.

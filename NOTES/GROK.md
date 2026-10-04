Grok Bot (Developer Bot hub + product leads) notes. Every change Grok Bot makes to this product (code, env, database, deploys) gets a dated entry here so Claude, Hermes and Codex stay on the same page.

## 2026-09-27 (CT) — Developer Bot (hub)
- Wallet registration: added `contentbot` to `wallet_api_clients` in Supabase project `kzneeksminozmhnqaaun`, with `require_sso=false`.
- Callback URLs registered: https://personalcontentbot.vercel.app/auth/apixis/callback.
- Vercel env: replaced `WALLET_API_KEY` with a per-product `apx_live_` key, added `APIXIS_CLIENT_ID=contentbot`, and left legacy `APIXIS_WALLET_API_KEY` present (name-only check); production was redeployed from the same product commit.
- Cleanup status: the attempted deletion of legacy `APIXIS_WALLET_API_KEY` variables was stopped at about 22:45 CT; no deletion was made here.
- Undo: restore `WALLET_API_KEY` to its legacy value and deactivate the `contentbot` client row.

## 2026-09-27 — Apixis ID + Wallet balance pill (Grok Bot)
- **What:** Merged Claude's PR #1 (Sign in with Apixis + shared Wallet) with Grok commit 4b3f6af: `ApixisWalletChip` (shared single fetch of `/api/wallet/balance`, refetch on focus / visibilitychange / pageshow, "Sign in with Apixis" when unlinked), balance route returns `linked`.
- **Where:** pill in the layout's top `apixis-badge` bar (every screen).
- **Merge SHA:** 40e3173. Prod READY; `/api/wallet/balance` → 401 `{signIn:true}` without a session.
- **Undo:** `git revert -m 1 40e3173` (or revert PR #1 in GitHub).
- No Wallet code, env/keys, Stripe, checkout or payment links changed.

---

## Backfill — 2026-10-02, Content Bot Lead (Grok)
Done 2026-10-02 by Content Bot Lead (Grok) on Awad's standing rule (every change gets a dated entry here). Covers everything since the last entry above (2026-09-27) through 2026-10-02, oldest first to match this file. Checked against GitHub commits on `main`, every PR in any state, branches, GitHub/Vercel deployments, and `AI_CHANGELOG.md`. Times are America/Chicago (CDT). PR #1 / 40e3173 is already logged above, so it isn't repeated. Only this file changed in this commit.

### 2026-09-27 --:-- CT — Audits by Content Bot Lead (read-only)
- **What:** Audits of PersonalContentBot by Content Bot Lead. Nothing was changed. (Exact time not recorded in GitHub.)
- **Where:** n/a. No commits, PRs, env, DB or deploy changes.
- **Who:** Content Bot Lead (Grok).
- **Undo:** n/a, read-only.

### 2026-09-27 22:23 CT — PR #6 Apixis cleanup (merged)
- **What:** One cleanup PR. Wallet host `apixiswallet.vercel.app` → `apixis-wallet.vercel.app` (host only in `env.example`, which fixes the doubled `/api/v1` paths). Added the "A Apixis Company" badge and the Cixy persona (`lib/cixy-persona.ts`). Fallback billing, health route, auth cleanup (removed the old `app/api/auth/magic-link`, `app/api/auth/verify`, `lib/auth.ts`, `tests/auth.test.ts`). Added `lib/public-job.ts`, `tests/cleanup.test.ts`, `tests/pipeline-billing.test.ts`.
- **Where:** PR #6 (branch `chore/apixis-cleanup`, since deleted), squash commit 8edbef6. 23 files. Prod deploy from 8edbef6 (GitHub deployment 6701741827).
- **Who:** Grok (Developer Bot / Content Bot Lead), committed as 313aidaroos.
- **Undo:** `git revert 8edbef6`.

### 2026-09-27 23:19 CT — Notes: hub changes entry (direct to main)
- **What:** Created `NOTES/GROK.md` with the 2026-09-27 Developer Bot (hub) entry.
- **Where:** commit 2f21732 (direct to main, `[skip ci]`). Prod deploy 6702329895.
- **Who:** Grok (Developer Bot hub).
- **Undo:** `git revert 2f21732` (notes only).

### 2026-09-27 23:52 CT — PR #1 prep: merge main into `claude/apixis-id-shared-wallet` + pill commit
- **What:** Merged main into the PR #1 branch (bffe9a0, 23:52 CT), then Grok's balance pill commit 4b3f6af (23:54 CT). Both landed on main through the PR #1 merge 40e3173 (23:59 CT), which is logged above.
- **Where:** branch `claude/apixis-id-shared-wallet` (still exists, 0 ahead of main). Preview deploys only.
- **Who:** Grok (Developer Bot).
- **Undo:** covered by `git revert -m 1 40e3173` (see entry above).

### 2026-09-28 00:02 CT — Notes: balance pill entry (direct to main)
- **What:** Appended the "Apixis ID + Wallet balance pill" entry to this file.
- **Where:** commit 76e2bba (direct to main, `[skip ci]`). Prod deploy 6702781832.
- **Who:** Grok (Developer Bot).
- **Undo:** `git revert 76e2bba` (notes only).

### 2026-09-28 04:08 CT — PR #7 Require AI change notes (AI_CHANGELOG.md)
- **What:** Added `AI_CHANGELOG.md` with the owner's rule that every AI appends a dated entry. Linked it from `CLAUDE.md`.
- **Where:** PR #7 (branch `junoai/ai-changelog`), squash commit 3863c02. Prod deploy 6706327519.
- **Who:** JunoAI.
- **Undo:** `git revert 3863c02`.

### 2026-09-28 04:45 CT — PR #8 Add shared CI
- **What:** Added `.github/workflows/ci.yml`, a thin caller of the shared workflow `313aidaroos/github-actions/.github/workflows/node-ci.yml@main`. Also added `JUNOAI_NOTES.md` and an `AI_CHANGELOG.md` entry.
- **Where:** PR #8 (branch `junoai/ci`), squash commit de1cc77. Prod deploy 6706985701.
- **Who:** JunoAI.
- **Undo:** `git revert de1cc77`.

### 2026-09-30 01:23 CT — PR #9 Tester readiness: identity/paid access + safe redirect
- **What:** Billing identity (Apixis subject) is now separate from local job ownership (verified session email), with ownership-scoped reads for older SSO jobs. Generation inputs are validated and billing requires a verified email. Added the canonical local-redirect validator (`lib/apixis-redirect.ts`) at login start and callback, with regression tests. Server now falls back to `NEXT_PUBLIC_SUPABASE_URL`.
- **Where:** PR #9 (branch `codex/tester-readiness`), squash commit 4b1ddc4. 11 files, including `lib/db.ts`, `lib/pipeline.ts`, `lib/apixis-login.ts`, `app/api/jobs/*`, and tests. Prod deploy 6752972443.
- **Who:** Codex.
- **Undo:** `git revert 4b1ddc4`.

### 2026-09-30 02:34 CT — PR #10 Re-sync Apixis kits (login kit + Wallet SDK v3.1)
- **What:** Re-copied canonical `lib/apixis-login.ts` (`verifyOtp` type `email`, D16) and `lib/apixis-wallet.ts` (SDK v3.1) from ApixisWallet.
- **Where:** PR #10 (branch `claude/awesome-newton-3tygzi`), squash commit 3865218. Prod deploy dpl_Evvp9izUek4LCHCz2F9s1jZCp6CV (READY).
- **Who:** Claude (Claude Code).
- **Undo:** `git revert 3865218`.

### 2026-09-30 02:56 CT — PR #11 Cixy on shared family persona core
- **What:** The Cixy prompt now starts from the shared family core in `lib/apixis-cixy.ts`, and `lib/cixy-persona.ts` keeps only family facts plus the PCB role. On provider failure, `/api/cixy` returns a calm 503/429 reply.
- **Where:** PR #11 (branch `claude/awesome-newton-3tygzi`), squash commit 6719375. **Prod deploy dpl_4crCqYuKXtBiv7St3odcKcDy3yfb FAILED (ERROR):** `app/api/cixy/route.ts` was missing the `cixyUnavailableReply` import. PR #12 fixed it 6 minutes later. Prod kept serving the previous READY build.
- **Who:** Claude (Claude Code).
- **Undo:** `git revert 6719375`.

### 2026-09-30 03:02 CT — PR #12 Durable jobs + reconcile cron (gated by PCB_DURABLE_JOBS)
- **What:** A retried click (same `attemptId`) now returns the existing job and does not charge twice. The Wallet hold and receipt are stored on the job. Added the `/api/cron/reconcile-jobs` cron (every 10 min in `vercel.json`): renders stuck over 15 min have their hold released and are marked failed, and jobs captured but unfinished are flagged for support. All of this is gated by `PCB_DURABLE_JOBS=true`. Added `supabase/pcb_jobs_durable.sql` (owner runs it). Fixed the missing Cixy import and added the `typecheck`/`test` scripts to `package.json`.
- **Where:** PR #12 (branch `claude/awesome-newton-3tygzi`), squash commit bee28b0. 11 files. Prod deploy dpl_D9jhjs3mXDfRLHon2uaXBv6HfP1h (READY). No SQL was run and no env was set by this PR.
- **Who:** Claude (Claude Code).
- **Undo:** `git revert bee28b0` (this brings the #11 build break back unless #11 is reverted too).

### 2026-10-01 20:56 CT — PR #13 .env.example lists every env var
- **What:** New `.env.example` listing every env var name the code reads (names only, no values), plus an `AI_CHANGELOG.md` entry. No code changed.
- **Where:** PR #13 (branch `claude/awesome-newton-3tygzi`), squash commit c3c5b11. Auto prod deploy dpl_9FAJx6c22RRaQGoXMGczuZ9deMYB (READY, 20:56 CT).
- **Who:** Claude (Claude Code).
- **Undo:** `git revert c3c5b11`.

### 2026-10-01 21:56 CT — Production redeploy on c3c5b11
- **What:** Production redeployed from the same commit c3c5b11 (no code change). This is the current prod build.
- **Where:** Vercel deploy dpl_EL2fYmef1PJ6nTrWjja4A4boiTRw (READY, creator 313aidaroos).
- **Who:** 313aidaroos account (Developer Bot hub / owner).
- **Undo:** promote/roll back to dpl_9FAJx6c22RRaQGoXMGczuZ9deMYB (same commit).

### 2026-10-02 --:-- CT — Read-only review by Content Bot Lead
- **What:** Read-only review of the repo. Nothing was changed. Findings for this repo: all 13 PRs are MERGED, none are open or closed-unmerged, so no 10/01–10/02 closures apply here. No `/companies` pages or work. No `juno/*` branches. Remaining branches: `claude/apixis-id-shared-wallet`, `claude/awesome-newton-3tygzi`, `codex/tester-readiness`, `junoai/ai-changelog`, `junoai/ci` (all already squash-merged). No Hermes commits since 2026-09-27.
- **Where:** n/a. The only write is this notes backfill (`NOTES/GROK.md`).
- **Who:** Content Bot Lead (Grok).
- **Undo:** n/a, read-only. For this backfill: revert the commit that adds this section.

---

## 2026-10-04 — Claude-review pass, Content Bot Lead (Grok)
Done 2026-10-04 ~18:45–19:15 CT on Awad's request (relayed by the Developer Bot hub at 18:43 CT): find everything Claude did since `5ae3997`, check it against Awad's locks, fix anything broken, and log it here. Times are America/Chicago (CDT). Oldest first, matching this file.

### 2026-10-04 12:01 CT — Production redeploy on 5ae3997 (no code change)
- **What:** Vercel production redeploy of the same commit 5ae3997. Not tied to a new commit or PR.
- **Where:** Vercel deploy dpl_GjYup8hBSRQtj2eAtech8uHmwV5x (READY, creator 313aidaroos).
- **Who:** 313aidaroos account. Which agent or person triggered it isn't recorded.
- **Undo:** n/a (same commit as dpl_DN8DAyLzVQPwDy7gJioN3LpzztH5).

### 2026-10-04 18:29 CT — PR #14 Claude full-portfolio review notes (merged 18:31 CT)
- **What:** Notes only. Added `NOTES/CLAUDE.md` (this repo's part of Claude's 24-repo review: what's live, what's open, owners, drift) and one `AI_CHANGELOG.md` entry. No code, env, DB or deploy changes. Claude's open items: `supabase/pcb_jobs_durable.sql` not applied (keep `PCB_DURABLE_JOBS` unset), check the Vercel plan allows `maxDuration: 300`, `.env.example` and `env.example` both exist, and the SQL header names a wrong hub ref.
- **Where:** PR #14 (branch `claude/great-fermi-6brq7a`, commit cc6917e at 18:28 CT), squash commit 0b5e1c1. Prod deploy dpl_HEWx8SKKJ5XXYYENNC6vQfAfm5i4 (READY, 18:31 CT).
- **Who:** Claude (Claude Code). Merged as 313aidaroos with Awad's approval.
- **Undo:** `git revert 0b5e1c1` (notes only).

### 2026-10-04 ~19:00 CT — Review result + fix PR (branch `grok/claude-review-fixes`)
- **What (review):** PR #14 is Claude's only change since 5ae3997, and it's notes only. Other branches have nothing new. No `codex/`, `junoai/`, `juno/` or Hermes work since 10-02. On main: `npm ci`, `tsc --noEmit`, `npx jest` (4 suites, 15 tests) and `npm run build` all pass. Prod `/`, `/pricing`, `/auth`, `/api/health` all return 200. No SVG anywhere in the repo (no `.svg` files, inline `<svg>`, `data:image/svg` or SVG imports).
- **What (fix):** Lock violation found in the shared Cixy core `lib/apixis-cixy.ts`, which Claude added in PR #11 as a copy of `ApixisWallet/sdk/apixis-cixy.ts`. It had "Arab and Muslim culture" / "announce your faith", Salam / As-salamu alaykum replies, Insha'Allah / alhamdulillah, and the religious-ruling "not a scholar" line. Those lines are removed. Cixy keeps warm hospitality, matches the warmth of the greeting (Hi to Hi), and keeps greetings and phrases plain and neutral. "whatever their faith" now reads "whoever they are". `tests/cleanup.test.ts` now asserts that none of the religious terms appear in the Cixy prompt. Nothing else changed (no UI, routes or billing).
- **CANONICAL COPY:** `ApixisWallet/sdk/apixis-cixy.ts` (and `docs/CIXY.md`) still has these lines. It needs the same fix, or the next kit re-sync will bring them back here. The file header marks this as a local divergence.
- **Left as is:** The "clean recommendations" list (alcohol, pork, gambling, interest-based lending, …) is kept unchanged for Awad to decide. `AI_CHANGELOG.md` line 40 (historical log) mentions "salaam" and was left untouched.
- **Where:** `lib/apixis-cixy.ts`, `tests/cleanup.test.ts`, `AI_CHANGELOG.md`, this file. PR from `grok/claude-review-fixes` (squash-merged; see GitHub for the SHA).
- **Who:** Content Bot Lead (Grok).
- **Undo:** `git revert <squash SHA of the grok/claude-review-fixes PR>`.

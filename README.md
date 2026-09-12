# Multi-Agent Video Generation & Posting Pipeline

Idea → script → AI-generated clips → assembled MP4 → posted across six platforms.
Node 20+, TypeScript, SQLite. Every step checkpoints, so a failed run resumes
instead of regenerating (and re-paying for) everything upstream.

## Setup

```bash
npm install
cp .env.example .env      # fill in keys
npm run migrate
npm run start -- --idea "cyberpunk cooking show" --dry-run
```

`ffmpeg` and `ffprobe` must be on PATH (`brew install ffmpeg` / `apt install ffmpeg`).

## Commands

```bash
npm run start -- --idea "cyberpunk cooking show"
npm run start -- --trending --niche "specialty coffee"
npm run start -- --idea "..." --orientation horizontal --platforms youtube,linkedin
npm run start -- --resume <job-id>          # resume from last good checkpoint
npm run status -- --id <job-id>
npm run schedule -- --time "2026-09-10T14:00:00Z" --trending
npm run worker                               # executes scheduled jobs
```

`--dry-run` runs the whole pipeline and renders the video but posts nothing.

## Architecture

```
CLI ──► Orchestrator ──► Ideation ──► Scriptwriter ──► Video ──► Assembly ──► Poster
             │                                                                  │
             └── SQLite: jobs, steps (checkpoints), posts, analytics, logs ──────┘
```

| Agent | Does | Key file |
|---|---|---|
| Ideation | Concept from a seed, from live trends, or from nothing | `src/agents/ideation.ts` |
| Scriptwriter | Timed scenes, Runway prompts, keyframe prompts, VO | `src/agents/scriptwriter.ts` |
| Video | Runway task submit → poll → download, concurrency-capped | `src/agents/video.ts` |
| Assembly | Normalise → crossfade → mix VO + music → burn captions → bumpers | `src/agents/assembly.ts` |
| Poster | Per-platform copy, staggered publishing, rate limits | `src/agents/poster.ts` |
| Orchestrator | Checkpointing, resume, status, error capture | `src/agents/orchestrator.ts` |

## Five things in the spec that don't match how these APIs actually work

**1. Runway has no negative prompt.** Gen-4 accepts one positive `promptText`;
there is no field for "blurry, distorted, deformed…". Those terms are kept in
`src/services/images.ts` and applied to Stability image generation, which does
support them. For video, quality is steered positively instead — see
`POSITIVE_QUALITY` and `buildRunwayPrompt()`.

**2. `gen4_turbo` is image-to-video only.** It cannot take a bare text prompt.
Two modes are supported via `RUNWAY_MODE`:
- `t2v` (default) — text straight to video using `gen4.5`
- `i2v` — generate a keyframe first (DALL·E/gpt-image-1 or Stability), then animate it with `gen4_turbo`

`i2v` costs an extra image call per scene but gives far more control over
composition. Worth testing both on your first few videos.

**3. Runway does not output 1080p.** Gen-4 ratios top out around 720p
(`720:1280` vertical, `1280:720` horizontal). The assembly step upscales to
1080×1920 / 1920×1080 during normalisation, which is what every platform wants,
but the source detail is 720p. Nothing in the API changes that.

**4. Instagram, TikTok, and Facebook do not accept file uploads.** They fetch
the video from a public HTTPS URL. That's why `PUBLIC_UPLOAD_PROVIDER` exists —
it pushes the finished MP4 to Supabase Storage and hands the public URL to those
three. Without it configured, those platforms are skipped with a clear error
while YouTube, X, and LinkedIn (which take real uploads) still post.

**5. Rate limiting is enforced from the database, not memory.** A restart
doesn't reset the counter — `countPostsInLastHour()` queries actual post
timestamps, so `MAX_POSTS_PER_HOUR_PER_PLATFORM` holds across process restarts.

## What still needs your developer

- **`npm install` and a first compile.** This was written without network access, so nothing has been installed or executed. Expect a small number of type fixes once `@types/node` is present.
- **OAuth setup per platform.** Each needs its own app and credentials. YouTube needs a refresh token from the OAuth playground. TikTok needs its Content Posting API scope approved *and* your Supabase storage domain verified in their portal — unverified domains fail at init. Instagram needs a Business/Creator account linked to a Facebook Page. LinkedIn needs `w_member_social` or the organisation equivalent.
- **TikTok privacy level.** Set to `PUBLIC_TO_EVERYONE` in `src/platforms/tiktok.ts`. Apps that haven't passed TikTok's audit can only post `SELF_ONLY` — change it if your app is unaudited or every post will fail.
- **Caption timing.** `src/services/captions.ts` distributes each scene's VO evenly across its window. That's close but not word-accurate. For tight captions, run Whisper over the rendered voiceover and rebuild the SRT from real word timestamps.
- **Analytics collection.** The `analytics` table and `saveAnalytics()` are wired; the per-platform fetchers are not written. Each platform's insights endpoint differs enough that it's worth doing once you know which ones you'll actually keep.
- **API drift.** Version-pinned endpoints (`LinkedIn-Version: 202411`, Graph `v21.0`, `X-Runway-Version`) move. Check them against current docs before go-live.

## Cost per video (rough)

Six 5-second Runway clips plus an LLM pass plus ElevenLabs VO lands around
\$1.50–\$4.00 depending on model and clip count. `--dry-run` and `--resume`
exist specifically so you aren't re-paying for that while debugging the posting
half of the pipeline.

## Content safety

`src/lib/moderation.ts` screens the idea, the script, and every caption before
anything is generated or posted, using a blocklist plus OpenAI's moderation
endpoint. Runway content-policy rejections are treated as fatal rather than
retried, since they never succeed on a second attempt.

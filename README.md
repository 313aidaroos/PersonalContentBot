# PersonalContentBot

Queue a one-minute social video. This repo makes the job. Socixis posts it.

## Pricing

Pay with **Ixis** (Apixis family currency). **100 Ixis = $1**. Paid Ixis never expires.

- **60s Video Clip**: 800 Ixis · $8 per clip (script + storyboard + render)
- **Creator Seat (Monthly)**: 20,000 Ixis · $200/mo (unlimited videos for 30 days)
- **AI Text Job**: 40 Ixis · $0.40
- **AI Image**: 150 Ixis · $1.50
- **Ad Set**: 400 Ixis · $4
- **Template/Skin**: 1,000 Ixis · $10 (one-off)

Buy Ixis at [Apixis Wallet](https://apixiswallet.vercel.app). Redeem inside Content Bot.

## What works now

- Magic-link auth (no password)
- Cixy chat: Muslim AI assistant for video content (salaam, halal-conscious, prayer-aware)
- Web studio: enter an idea, get a job
- Real `pcb_jobs` table (Supabase)
- Pipeline: queued → scripting → rendering → ready
- Script (60s beats, captions VTT) and 9:16 storyboard
- Real silent MP4 (ffmpeg): Grok Imagine hero clip for the first 15s when `XAI_API_KEY` is set, caption slides to 60s. Any xAI error (403, billing, timeout) falls back to slides only.
- Pricing page with Ixis catalog
- Wallet redemption API (stub; awaiting @apixiswallet INTEGRATION.md)
- Posting stays with Socixis

## Local

```
npm install
cp env.example .env.local   # or use the existing .env.local
npm run setup-db
npm run dev
```

Open http://localhost:3000 and submit an idea.

## API

- `GET /api/health`
- `GET /api/jobs`
- `POST /api/jobs` `{ "idea": "...", "niche": "...", "orientation": "vertical" }`
- `GET /api/jobs/:id`
- `POST /api/auth/magic-link` `{ "email": "..." }`
- `GET /api/auth/verify?token=...&email=...`
- `POST /api/cixy` `{ "messages": [...] }`
- `POST /api/support` `{ "name", "email", "subject", "message" }`

Do not wire posting here.

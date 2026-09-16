# PersonalContentBot

Queue a one-minute social video. This repo makes the job. Socixis posts it.

## What works now

- Web studio: enter an idea, get a job
- Real `pcb_jobs` table (Supabase)
- Pipeline: queued → scripting → rendering → ready
- Script (60s beats, captions VTT) and 9:16 storyboard are real
- MP4 render is stubbed on purpose (ffmpeg/Runway next)

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

Do not wire posting here.

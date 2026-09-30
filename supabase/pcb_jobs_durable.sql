-- Durable jobs (2026-09-30). Run once in the Supabase SQL editor of the project that holds
-- public.pcb_jobs (the shared hub project, ref myfclypikkcvfurrlsko), then set
-- PCB_DURABLE_JOBS=true on the PersonalContentBot Vercel project.
--
-- attempt_id            the client's per-click id: a retry after a lost response finds the SAME job
--                       instead of rendering (and charging) twice.
-- wallet_reservation_id the Apixis Wallet hold behind the job, so a render that dies can be reconciled
--                       (hold released, job marked failed) by /api/cron/reconcile-jobs.
-- wallet_receipt_id     the Wallet capture receipt once the clip was delivered and charged.
alter table public.pcb_jobs
  add column if not exists attempt_id text,
  add column if not exists wallet_reservation_id text,
  add column if not exists wallet_receipt_id text;

create unique index if not exists pcb_jobs_owner_attempt_idx
  on public.pcb_jobs (owner_email, attempt_id) where attempt_id is not null;
create index if not exists pcb_jobs_stuck_idx
  on public.pcb_jobs (status, updated_at) where status in ('queued', 'scripting', 'rendering');

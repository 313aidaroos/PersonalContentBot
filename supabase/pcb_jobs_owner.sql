-- Change note (Claude, Sep 2026): New. Adds `owner_email` + index (applied). See docs/LAUNCH_NOTES.md.
-- Jobs belong to the member who paid for them. The API filters every read by owner_email
-- (the verified session email). Apply BEFORE deploying the matching code.
alter table public.pcb_jobs add column if not exists owner_email text;
create index if not exists pcb_jobs_owner_created_idx on public.pcb_jobs (owner_email, created_at desc);

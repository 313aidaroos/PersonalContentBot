-- Content Bot support intake. Routed contentbot@apixis.dev -> awad@apixis.dev.
create table if not exists public.pcb_support_tickets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  intake_address text not null default 'contentbot@apixis.dev',
  route_to text not null default 'awad@apixis.dev',
  created_at timestamptz not null default now()
);
alter table public.pcb_support_tickets enable row level security;
-- service role only; no anon/authenticated policies on purpose.

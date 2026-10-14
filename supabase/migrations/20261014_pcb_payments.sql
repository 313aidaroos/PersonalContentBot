-- Card + recorded payment ledger for PersonalContentBot.
-- FILE ONLY. Do not run this from CI, from an agent, or against a live database.
-- The owner applies it in the Supabase SQL editor of the project that holds public.pcb_jobs,
-- after CONTENTBOT_CARD_PAYMENTS is ready to turn on.
--
-- Service role only. RLS is on and there are no policies, so the anon and authenticated
-- Data API roles cannot read or write these rows. The app uses the service role and
-- always filters by the signed-in email.

create table if not exists public.pcb_payments (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null,
  method text not null check (method in ('card', 'ixis')),
  sku text not null,
  description text not null,
  amount_cents integer,
  amount_ixis integer,
  currency text not null default 'usd',
  status text not null check (status in ('pending', 'paid', 'refunded')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_subscription_id text,
  stripe_event_id text,
  renews_at timestamptz,
  cancel_at_period_end boolean not null default false,
  job_id uuid,
  created_at timestamptz not null default now()
);

create unique index if not exists pcb_payments_event_idx
  on public.pcb_payments (stripe_event_id) where stripe_event_id is not null;
create unique index if not exists pcb_payments_session_idx
  on public.pcb_payments (stripe_checkout_session_id) where stripe_checkout_session_id is not null;
create unique index if not exists pcb_payments_payment_intent_idx
  on public.pcb_payments (stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create index if not exists pcb_payments_owner_idx
  on public.pcb_payments (owner_email, created_at desc);

alter table public.pcb_payments enable row level security;

revoke all on table public.pcb_payments from anon, authenticated;
grant select, insert, update on table public.pcb_payments to service_role;

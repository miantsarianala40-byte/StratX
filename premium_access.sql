-- StratX Premium access control
-- Run this file in Supabase SQL Editor.
-- Granting access is deliberately server-managed; normal authenticated users cannot write subscriptions.

create table if not exists public.premium_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'inactive' check (status in ('active', 'inactive', 'expired')),
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.premium_subscriptions enable row level security;

drop policy if exists "Users can read their own Premium status" on public.premium_subscriptions;
create policy "Users can read their own Premium status"
  on public.premium_subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policy is provided for authenticated users.
-- Manage subscription rows from the Supabase SQL Editor (service/admin access).
-- Example manual grant (replace the UUID and expiry as needed):
-- insert into public.premium_subscriptions (user_id, status, expires_at)
-- values ('USER-UUID-HERE', 'active', now() + interval '30 days')
-- on conflict (user_id) do update
-- set status = excluded.status, expires_at = excluded.expires_at, updated_at = now();

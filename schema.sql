-- StratX Premium schema — exécutable plusieurs fois sans dupliquer les policies.
-- À lancer dans Supabase > SQL Editor avec un compte administrateur du projet.

create table if not exists public.analyses (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  body text not null check (char_length(trim(body)) between 1 and 3000),
  created_at timestamptz not null default now()
);

create table if not exists public.sports_analyses (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  competition text not null check (char_length(trim(competition)) between 1 and 100),
  teams text not null check (char_length(trim(teams)) between 1 and 150),
  notes text not null check (char_length(trim(notes)) between 1 and 3000),
  match_date timestamptz,
  created_at timestamptz not null default now()
);
alter table public.sports_analyses add column if not exists match_date timestamptz;

create table if not exists public.game_observations (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_name text not null check (game_name in ('Aviator','JetX','CosmoX')),
  multiplier numeric(12,2) check (multiplier is null or multiplier > 0),
  note text check (note is null or char_length(note) <= 500),
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.game_observations add column if not exists observed_at timestamptz not null default now();

create index if not exists analyses_created_at_idx on public.analyses(created_at desc);
create index if not exists sports_analyses_match_date_idx on public.sports_analyses(match_date desc nulls last);
create index if not exists game_observations_user_game_date_idx on public.game_observations(user_id, game_name, observed_at desc);

alter table public.analyses enable row level security;
alter table public.sports_analyses enable row level security;
alter table public.game_observations enable row level security;

grant select, insert on public.analyses, public.sports_analyses, public.game_observations to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Drop/recreate policies to keep this script idempotent.
drop policy if exists "read analyses" on public.analyses;
drop policy if exists "insert own analyses" on public.analyses;
drop policy if exists "read sports" on public.sports_analyses;
drop policy if exists "read own sports" on public.sports_analyses;
drop policy if exists "insert own sports" on public.sports_analyses;
drop policy if exists "read own observations" on public.game_observations;
drop policy if exists "insert own observations" on public.game_observations;

-- Community posts and match cards are readable to authenticated members.
create policy "read analyses" on public.analyses for select to authenticated using (true);
create policy "insert own analyses" on public.analyses for insert to authenticated with check (auth.uid() = user_id);
create policy "read own sports" on public.sports_analyses for select to authenticated using (auth.uid() = user_id);
create policy "insert own sports" on public.sports_analyses for insert to authenticated with check (auth.uid() = user_id);
-- Game observations remain private to their owner.
create policy "read own observations" on public.game_observations for select to authenticated using (auth.uid() = user_id);
create policy "insert own observations" on public.game_observations for insert to authenticated with check (auth.uid() = user_id);


-- Communauté: auteur affiché, commentaires partagés et demandes de suppression.
alter table public.analyses add column if not exists author_name text not null default 'Membre StratX';

create table if not exists public.community_comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.analyses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Membre StratX',
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists community_comments_post_created_idx on public.community_comments(post_id, created_at);
alter table public.community_comments enable row level security;
grant select, insert, delete on public.community_comments to authenticated;
grant usage, select on sequence public.community_comments_id_seq to authenticated;
drop policy if exists "read community comments" on public.community_comments;
drop policy if exists "insert own community comments" on public.community_comments;
drop policy if exists "delete own or post comments" on public.community_comments;
create policy "read community comments" on public.community_comments for select to authenticated using (true);
create policy "insert own community comments" on public.community_comments for insert to authenticated with check (auth.uid() = user_id);
create policy "delete own or post comments" on public.community_comments for delete to authenticated using (auth.uid() = user_id or exists (select 1 from public.analyses a where a.id = post_id and a.user_id = auth.uid()) or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Post owners can delete their own publications; administrators may moderate all posts.
grant delete on public.analyses to authenticated;
drop policy if exists "delete own or admin analyses" on public.analyses;
create policy "delete own or admin analyses" on public.analyses for delete to authenticated using (auth.uid() = user_id or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create table if not exists public.account_deletion_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending','verified','completed','rejected')),
  created_at timestamptz not null default now()
);
alter table public.account_deletion_requests enable row level security;
grant insert, select on public.account_deletion_requests to authenticated;
drop policy if exists "insert own account deletion request" on public.account_deletion_requests;
drop policy if exists "read own account deletion request" on public.account_deletion_requests;
create policy "insert own account deletion request" on public.account_deletion_requests for insert to authenticated with check (auth.uid() = user_id and email = (auth.jwt() ->> 'email'));
create policy "read own account deletion request" on public.account_deletion_requests for select to authenticated using (auth.uid() = user_id);


-- StratX Premium manual validation tables and policies.
-- Keep this section in sync with premium_access.sql so either SQL file can
-- install the Premium workflow on a fresh project.
-- StratX Premium manual-payment validation workflow
-- Run in Supabase SQL Editor. Safe to re-run.
create table if not exists public.premium_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'inactive' check (status in ('active', 'inactive', 'expired')),
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.premium_subscriptions enable row level security;
drop policy if exists "Users can read their own Premium status" on public.premium_subscriptions;
create policy "Users can read their own Premium status" on public.premium_subscriptions for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Admins manage Premium subscriptions" on public.premium_subscriptions;
create policy "Admins manage Premium subscriptions" on public.premium_subscriptions for all to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create table if not exists public.premium_payment_requests (
  id bigint generated by default as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_method text not null check (payment_method in ('MVola','Orange Money','Airtel Money','Transfert bancaire / autre')),
  transaction_ref text not null,
  amount_ariary numeric(12,0) not null check (amount_ariary > 0),
  note text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  reviewed_by uuid null references auth.users(id) on delete set null
);
create index if not exists premium_payment_requests_user_created_idx on public.premium_payment_requests(user_id, created_at desc);
alter table public.premium_payment_requests enable row level security;
drop policy if exists "Users submit own Premium requests" on public.premium_payment_requests;
create policy "Users submit own Premium requests" on public.premium_payment_requests for insert to authenticated with check (auth.uid() = user_id and status = 'pending');
drop policy if exists "Users read own Premium requests" on public.premium_payment_requests;
create policy "Users read own Premium requests" on public.premium_payment_requests for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Admins manage Premium requests" on public.premium_payment_requests;
create policy "Admins manage Premium requests" on public.premium_payment_requests for all to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
-- Admins must be assigned app_metadata.role = 'admin' by a trusted Supabase administrator.
-- Never set admin role from client-side code or user-editable user_metadata.


-- Explicit table privileges are required in addition to RLS policies.
grant select on public.premium_subscriptions to authenticated;
grant select, insert, update on public.premium_payment_requests to authenticated;
grant usage, select on sequence public.premium_payment_requests_id_seq to authenticated;

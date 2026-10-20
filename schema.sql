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
drop policy if exists "insert own sports" on public.sports_analyses;
drop policy if exists "read own observations" on public.game_observations;
drop policy if exists "insert own observations" on public.game_observations;

-- Community posts and match cards are readable to authenticated members.
create policy "read analyses" on public.analyses for select to authenticated using (true);
create policy "insert own analyses" on public.analyses for insert to authenticated with check (auth.uid() = user_id);
create policy "read sports" on public.sports_analyses for select to authenticated using (true);
create policy "insert own sports" on public.sports_analyses for insert to authenticated with check (auth.uid() = user_id);
-- Game observations remain private to their owner.
create policy "read own observations" on public.game_observations for select to authenticated using (auth.uid() = user_id);
create policy "insert own observations" on public.game_observations for insert to authenticated with check (auth.uid() = user_id);

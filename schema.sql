-- StratX schema : exécuter une seule fois dans Supabase > SQL Editor.
create table if not exists public.analyses (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(char_length(trim(title)) between 1 and 120),
 body text not null check(char_length(trim(body)) between 1 and 3000),
 created_at timestamptz not null default now()
);
create table if not exists public.sports_analyses (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 competition text not null check(char_length(trim(competition)) between 1 and 100),
 teams text not null check(char_length(trim(teams)) between 1 and 150),
 notes text not null check(char_length(trim(notes)) between 1 and 3000),
 created_at timestamptz not null default now()
);
create table if not exists public.game_observations (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 game_name text not null check(game_name in ('Aviator','JetX','CosmoX','Autre')),
 multiplier numeric(12,2) null check(multiplier is null or multiplier > 0),
 note text null check(note is null or char_length(note) <= 500),
 created_at timestamptz not null default now()
);
alter table public.analyses enable row level security;
alter table public.sports_analyses enable row level security;
alter table public.game_observations enable row level security;
revoke all on public.analyses, public.sports_analyses, public.game_observations from anon;
grant select,insert on public.analyses, public.sports_analyses, public.game_observations to authenticated;
grant usage,select on all sequences in schema public to authenticated;
drop policy if exists "Read analyses" on public.analyses;
drop policy if exists "Insert own analyses" on public.analyses;
create policy "Read analyses" on public.analyses for select to authenticated using(true);
create policy "Insert own analyses" on public.analyses for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "Read sports analyses" on public.sports_analyses;
drop policy if exists "Insert own sports analyses" on public.sports_analyses;
create policy "Read sports analyses" on public.sports_analyses for select to authenticated using(true);
create policy "Insert own sports analyses" on public.sports_analyses for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "Read game observations" on public.game_observations;
drop policy if exists "Insert own game observations" on public.game_observations;
create policy "Read game observations" on public.game_observations for select to authenticated using(auth.uid()=user_id);
create policy "Insert own game observations" on public.game_observations for insert to authenticated with check(auth.uid()=user_id);
create index if not exists analyses_created_at_idx on public.analyses(created_at desc);
create index if not exists sports_analyses_created_at_idx on public.sports_analyses(created_at desc);
create index if not exists game_observations_user_created_idx on public.game_observations(user_id,created_at desc);

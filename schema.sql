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


-- StratX visitor counter: one row per persistent browser identifier.
create table if not exists public.public_page_visits (
  visitor_key uuid primary key,
  device_label text not null default 'Appareil non identifié',
  visited_at timestamptz not null default now()
);
alter table public.public_page_visits add column if not exists visitor_key uuid;
alter table public.public_page_visits add column if not exists device_label text not null default 'Appareil non identifié';
alter table public.public_page_visits add column if not exists visited_at timestamptz not null default now();
-- Older anonymous visit rows receive identifiers so the unique constraint can be enabled.
update public.public_page_visits set visitor_key = gen_random_uuid() where visitor_key is null;
create unique index if not exists public_page_visits_visitor_key_uidx on public.public_page_visits(visitor_key);
create index if not exists public_page_visits_visited_at_idx on public.public_page_visits(visited_at desc);
alter table public.public_page_visits alter column visitor_key set not null;
alter table public.public_page_visits enable row level security;
grant select, insert on public.public_page_visits to anon, authenticated;
drop policy if exists "public can read page visits" on public.public_page_visits;
drop policy if exists "public can register page visit" on public.public_page_visits;
create policy "public can read page visits" on public.public_page_visits for select to anon, authenticated using (true);
create policy "public can register page visit" on public.public_page_visits for insert to anon, authenticated with check (visitor_key is not null and char_length(device_label) <= 100);

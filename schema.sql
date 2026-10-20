-- StratX: table analyses + policies RLS
create table if not exists public.analyses (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  body text not null check (char_length(trim(body)) between 1 and 3000),
  created_at timestamptz not null default now()
);

alter table public.analyses enable row level security;
revoke all on table public.analyses from anon;
grant select, insert on table public.analyses to authenticated;

drop policy if exists "Read analyses" on public.analyses;
drop policy if exists "Insert own analyses" on public.analyses;

create policy "Read analyses"
on public.analyses for select to authenticated
using (true);

create policy "Insert own analyses"
on public.analyses for insert to authenticated
with check (auth.uid() = user_id);

create index if not exists analyses_created_at_idx
on public.analyses (created_at desc);
create index if not exists analyses_user_id_idx
on public.analyses (user_id);

-- Rating sync (Pro): a user's decisions per photo/video, keyed by content id,
-- so the same shot on the phone and the computer carries the same rating.
-- No media, no file names, no paths — only what the user decided.
-- Reversible: drop table public.ratings; drop function public.has_pro().

-- Is the signed-in user's subscription live? Used by policies, so the Pro
-- gate is enforced by the database, not by the app. Invoker rights: it only
-- reads the caller's own subscription, which RLS allows anyway.
create function public.has_pro()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = (select auth.uid())
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

revoke execute on function public.has_pro() from public, anon;
grant execute on function public.has_pro() to authenticated;

create table public.ratings (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  media_id text not null check (media_id ~ '^[0-9a-f]{64}$'),
  rating smallint not null check (rating between -2 and 2),
  tags text[] not null default '{}' check (cardinality(tags) <= 50),
  place text check (char_length(place) <= 200),
  updated_at timestamptz not null default now(),
  primary key (user_id, media_id)
);

alter table public.ratings enable row level security;

-- Reading your own rows stays possible after a subscription ends (nothing is held hostage);
-- writing needs Pro.
create policy "ratings: read own"
  on public.ratings for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "ratings: insert own with pro"
  on public.ratings for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.has_pro()));

create policy "ratings: update own with pro"
  on public.ratings for update to authenticated
  using ((select auth.uid()) = user_id and (select public.has_pro()))
  with check ((select auth.uid()) = user_id and (select public.has_pro()));

create policy "ratings: delete own"
  on public.ratings for delete to authenticated
  using ((select auth.uid()) = user_id);

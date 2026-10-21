-- Accounts: a profile per user and their subscription. Media is not stored here.
-- Reversible: drop trigger on_auth_user_created on auth.users; drop function
-- public.handle_new_user(); drop table public.subscriptions, public.profiles.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

-- One row per user, written only by the payment webhook (service role).
-- There is deliberately no insert/update/delete policy: no client can
-- grant itself a subscription.
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  plan text not null default 'pro',
  current_period_end timestamptz,
  provider text not null default 'stripe',
  provider_customer_id text,
  provider_subscription_id text unique,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "subscriptions: read own"
  on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

-- A profile for every new sign-up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

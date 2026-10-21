-- Row-level security check. Run against the project (SQL editor or the
-- Supabase MCP `execute_sql`); it rolls back, nothing stays behind.
-- Expected: A sees 1 profile, 0 subscriptions/ratings of B, has_pro false;
-- "A grants self subscription" and "A (no pro) writes rating" denied 42501;
-- B has_pro true, "B (pro) writes rating" allowed, "B writes into A rows"
-- denied; B's rating of b still 2. Last run: 2026-10-21, all as expected.
begin;
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.invalid', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.invalid', 'authenticated', 'authenticated');
insert into public.subscriptions (user_id, status) values ('00000000-0000-0000-0000-00000000000b', 'active');
insert into public.ratings (user_id, media_id, rating) values ('00000000-0000-0000-0000-00000000000b', repeat('b', 64), 2);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

create temp table results (check_name text, outcome text) on commit drop;
insert into results select 'A sees profiles', count(*)::text from public.profiles;
insert into results select 'A sees subscriptions of B', count(*)::text from public.subscriptions;
insert into results select 'A sees ratings of B', count(*)::text from public.ratings;
insert into results select 'A has_pro', public.has_pro()::text;

do $$ begin
  begin insert into public.subscriptions (user_id, status) values ('00000000-0000-0000-0000-00000000000a', 'active');
    insert into results values ('A grants self subscription', 'ALLOWED');
  exception when others then insert into results values ('A grants self subscription', 'denied: ' || sqlstate); end;
  begin insert into public.ratings (media_id, rating) values (repeat('a', 64), 1);
    insert into results values ('A (no pro) writes rating', 'ALLOWED');
  exception when others then insert into results values ('A (no pro) writes rating', 'denied: ' || sqlstate); end;
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
insert into results select 'B has_pro', public.has_pro()::text;
do $$ begin
  begin insert into public.ratings (media_id, rating, tags) values (repeat('c', 64), 1, '{Food}');
    insert into results values ('B (pro) writes rating', 'allowed');
  exception when others then insert into results values ('B (pro) writes rating', 'DENIED: ' || sqlstate); end;
  begin insert into public.ratings (user_id, media_id, rating) values ('00000000-0000-0000-0000-00000000000a', repeat('d', 64), 1);
    insert into results values ('B writes into A rows', 'ALLOWED');
  exception when others then insert into results values ('B writes into A rows', 'denied: ' || sqlstate); end;
end $$;
insert into results select 'B rating of b still 2', (select rating::text from public.ratings where media_id = repeat('b', 64));
select * from results;
rollback;

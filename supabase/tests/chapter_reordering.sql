begin;
create function pg_temp.check_order(value boolean, description text) returns boolean language plpgsql as $$
begin
  if value is distinct from true then raise exception 'FAIL: %', description; end if;
  return true;
end;
$$;
create function pg_temp.reject_order(statement text, expected_code text) returns boolean language plpgsql as $$
begin
  begin execute statement;
  exception when others then
    if sqlstate = expected_code then return true; end if;
    raise exception 'Expected %, got %: %', expected_code, sqlstate, sqlerrm;
  end;
  raise exception 'Invalid reordering unexpectedly succeeded';
end;
$$;
insert into auth.users(id, email) values
  ('00000000-0000-4000-8000-000000000011', 'phase3-a@example.test'),
  ('00000000-0000-4000-8000-000000000012', 'phase3-b@example.test');
insert into public.chapters(id,user_id,title,sort_order) values
  ('10000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000011','A',0),
  ('10000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000011','B',1),
  ('10000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000012','Foreign chapter',0);
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000011', true);
select public.reorder_chapters(array['10000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000011']::uuid[]);
select pg_temp.check_order((select array_agg(title order by sort_order) = array['B','A'] from public.chapters), 'reordering persists the full order') as ok;
select pg_temp.reject_order($q$select public.reorder_chapters(array['10000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000013']::uuid[])$q$, '22023') as ok;
select pg_temp.reject_order($q$select public.reorder_chapters(array['10000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000011']::uuid[])$q$, '22023') as ok;
select pg_temp.reject_order($q$select public.reorder_chapters(array['10000000-0000-4000-8000-000000000011']::uuid[])$q$, '22023') as ok;
select pg_temp.reject_order($q$select public.reorder_chapters(null)$q$, '22023') as ok;
select pg_temp.reject_order($q$select public.reorder_chapters(array[]::uuid[])$q$, '22023') as ok;
select pg_temp.check_order((select array_agg(title order by sort_order) = array['B','A'] from public.chapters), 'failed reorders leave saved order intact') as ok;
select pg_temp.check_order((select count(*) = 0 from public.progress_events), 'reordering creates no duplicate journey events') as ok;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000012', true);
select pg_temp.check_order((select sort_order = 0 from public.chapters), 'other user order untouched') as ok;
set local role anon;
select pg_temp.reject_order($q$select public.reorder_chapters(array[]::uuid[])$q$, '42501') as ok;
reset role;
rollback;

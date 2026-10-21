-- Run against a DISPOSABLE migrated local Supabase database as postgres.
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/backend_foundation.sql
-- Fixtures and helper functions roll back, including if an assertion fails.
begin;

create function pg_temp.assert_true(value boolean, description text) returns boolean
language plpgsql as $$
begin
  if value is distinct from true then raise exception 'FAIL: %', description; end if;
  return true;
end;
$$;

create function pg_temp.assert_error(statement text, expected_code text, description text) returns boolean
language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate = expected_code then return true; end if;
    raise exception 'FAIL: %, expected %, got %: %', description, expected_code, sqlstate, sqlerrm;
  end;
  raise exception 'FAIL: %, statement unexpectedly succeeded', description;
end;
$$;

insert into auth.users(id, email) values
  ('00000000-0000-4000-8000-000000000001', 'lifepath-a@example.test'),
  ('00000000-0000-4000-8000-000000000002', 'lifepath-b@example.test');
select pg_temp.assert_true((select count(*) = 2 from public.profiles where id in
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002')), 'signup creates profiles') as ok;
select pg_temp.assert_true((select count(*) = 5 from pg_class where relnamespace = 'public'::regnamespace
  and relname in ('profiles','chapters','goals','goal_connections','progress_events') and relrowsecurity), 'all tables have RLS') as ok;
select pg_temp.assert_true(not has_function_privilege('authenticated', 'private.create_profile()', 'EXECUTE'), 'private trigger RPC revoked') as ok;
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.progress_events', 'UPDATE,DELETE'), 'history update/delete privileges revoked') as ok;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
insert into public.chapters(id, title) values ('10000000-0000-4000-8000-000000000002', 'B chapter');
insert into public.goals(id, title) values ('20000000-0000-4000-8000-000000000002', 'B goal');
insert into public.progress_events(event_type) values ('custom.b_note');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select pg_temp.assert_true((select count(*) = 1 from public.profiles), 'only own profile visible') as ok;
select pg_temp.assert_true((select count(*) = 0 from public.chapters), 'other chapters hidden') as ok;
select pg_temp.assert_true((select count(*) = 0 from public.goals), 'other goals hidden') as ok;
select pg_temp.assert_true((select count(*) = 0 from public.progress_events), 'other history hidden') as ok;
select pg_temp.assert_error($q$insert into public.goals(user_id,title) values ('00000000-0000-4000-8000-000000000002','forged')$q$, '42501', 'cannot insert as another owner') as ok;
select pg_temp.assert_error($q$insert into public.profiles(id) values ('00000000-0000-4000-8000-000000000002')$q$, '42501', 'cannot create another profile') as ok;
with changed as (update public.goals set title = 'stolen' where id = '20000000-0000-4000-8000-000000000002' returning id)
select pg_temp.assert_true((select count(*) = 0 from changed), 'cross-user update affects zero rows') as ok;
with removed as (delete from public.chapters where id = '10000000-0000-4000-8000-000000000002' returning id)
select pg_temp.assert_true((select count(*) = 0 from removed), 'cross-user delete affects zero rows') as ok;

insert into public.chapters(id,title,status) values
  ('10000000-0000-4000-8000-000000000001','A chapter','active'),
  ('10000000-0000-4000-8000-000000000003','Another active chapter','active');
select pg_temp.assert_true((select count(*) = 2 from public.chapters where status='active' and start_date is null), 'multiple undated active chapters allowed') as ok;
insert into public.goals(id,title,chapter_id) values
  ('20000000-0000-4000-8000-000000000001','A goal','10000000-0000-4000-8000-000000000001');
insert into public.goals(id,title) values
  ('20000000-0000-4000-8000-000000000003','C goal'),
  ('20000000-0000-4000-8000-000000000004','D goal');
select pg_temp.assert_true((select chapter_id is null and target_date is null from public.goals where title='C goal'), 'chapter and deadline optional') as ok;
select pg_temp.assert_error($q$update public.goals set chapter_id='10000000-0000-4000-8000-000000000002' where title='A goal'$q$, '23503', 'cross-user chapter forbidden') as ok;
select pg_temp.assert_error($q$update public.goals set parent_id='20000000-0000-4000-8000-000000000002' where title='A goal'$q$, '23503', 'cross-user parent forbidden') as ok;
select pg_temp.assert_error($q$update public.goals set user_id='00000000-0000-4000-8000-000000000002' where title='A goal'$q$, '23514', 'ownership cannot change') as ok;
select pg_temp.assert_error($q$update public.goals set id='20000000-0000-4000-8000-000000000099' where title='A goal'$q$, '23514', 'identity cannot change') as ok;
select pg_temp.assert_error($q$insert into public.goals(title) values ('  ')$q$, '23514', 'empty title rejected') as ok;
select pg_temp.assert_error($q$insert into public.chapters(title,start_date,end_date) values ('bad dates','2026-02-01','2026-01-01')$q$, '23514', 'date order checked') as ok;

update public.goals set parent_id='20000000-0000-4000-8000-000000000001' where title='C goal';
select pg_temp.assert_error($q$update public.goals set parent_id='20000000-0000-4000-8000-000000000003' where title='A goal'$q$, '23514', 'parent cycle rejected') as ok;
insert into public.goal_connections(id,source_goal_id,target_goal_id) values
  ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003'),
  ('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000004');
select pg_temp.assert_error($q$insert into public.goal_connections(source_goal_id,target_goal_id) values ('20000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000001')$q$, '23514', 'transitive prerequisite cycle rejected') as ok;
select pg_temp.assert_error($q$insert into public.goal_connections(source_goal_id,target_goal_id) values ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003')$q$, '23505', 'duplicate edge rejected') as ok;
select pg_temp.assert_error($q$insert into public.goal_connections(source_goal_id,target_goal_id,connection_type) values ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','related')$q$, '23514', 'self edge rejected') as ok;
select pg_temp.assert_error($q$insert into public.goal_connections(source_goal_id,target_goal_id) values ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002')$q$, '23503', 'cross-user target rejected') as ok;
select pg_temp.assert_error($q$insert into public.goal_connections(source_goal_id,target_goal_id) values ('20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001')$q$, '23503', 'cross-user source rejected') as ok;
insert into public.goal_connections(id,source_goal_id,target_goal_id,connection_type) values
  ('30000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000001','related');
select pg_temp.assert_error($q$update public.goal_connections set connection_type='prerequisite' where id='30000000-0000-4000-8000-000000000004'$q$, '23514', 'conversion to prerequisite cannot close cycle') as ok;
select pg_temp.assert_error($q$insert into public.goal_connections(source_goal_id,target_goal_id,connection_type) values ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000004','related')$q$, '23505', 'reverse related edge duplicate rejected') as ok;

update public.goals set status='completed' where title='A goal';
update public.goals set status='completed', title='A goal renamed' where id='20000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select count(*)=1 from public.progress_events where event_type='goal_completed'), 'completion event emitted exactly once') as ok;
select pg_temp.assert_true((select completed_at is not null from public.goals where id='20000000-0000-4000-8000-000000000001'), 'completion timestamp set and goal retained') as ok;
update public.goals set status='active' where id='20000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select count(*)=1 from public.progress_events where event_type='goal_reopened'), 'reopening recorded') as ok;
select pg_temp.assert_true((select completed_at is null from public.goals where id='20000000-0000-4000-8000-000000000001'), 'reopening clears completion timestamp') as ok;
update public.goals set status='abandoned' where title='D goal';
select pg_temp.assert_true((select count(*)=1 from public.progress_events where event_type='goal_abandoned'), 'abandonment recorded') as ok;
insert into public.goals(title,type,status) values ('Milestone','milestone','completed');
select pg_temp.assert_true((select count(*)=1 from public.progress_events where event_type='milestone_achieved'), 'completed insert and milestone event supported') as ok;
update public.chapters set status='completed' where title='A chapter';
update public.chapters set status='completed' where title='A chapter';
select pg_temp.assert_true((select count(*)=1 from public.progress_events where event_type='chapter_completed'), 'chapter completion deduplicated') as ok;
select pg_temp.assert_true((select count(*)=2 from public.progress_events where event_type='chapter_started'), 'chapter start recorded') as ok;
select pg_temp.assert_error($q$insert into public.progress_events(event_type) values ('goal_completed')$q$, '42501', 'automatic history cannot be forged') as ok;
select pg_temp.assert_error($q$insert into public.progress_events(user_id,event_type) values ('00000000-0000-4000-8000-000000000002','custom.forged')$q$, '42501', 'cross-user history insert rejected') as ok;
select pg_temp.assert_error($q$insert into public.progress_events(goal_id,event_type) values ('20000000-0000-4000-8000-000000000002','custom.forged')$q$, '23503', 'cross-user history goal rejected') as ok;
select pg_temp.assert_error($q$insert into public.progress_events(chapter_id,event_type) values ('10000000-0000-4000-8000-000000000002','custom.forged')$q$, '23503', 'cross-user history chapter rejected') as ok;
select pg_temp.assert_error($q$update public.progress_events set event_type='custom.changed'$q$, '42501', 'history update rejected') as ok;
select pg_temp.assert_error($q$delete from public.progress_events$q$, '42501', 'history delete rejected') as ok;
insert into public.progress_events(goal_id,event_type,metadata) values
  ('20000000-0000-4000-8000-000000000001','custom.note','{"text":"Remember this"}');
select pg_temp.assert_true((select count(*)=1 from public.progress_events where event_type='custom.note'), 'custom history append succeeds') as ok;
delete from public.goals where id='20000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select count(*)=1 from public.progress_events where event_type='goal_completed' and goal_id is null and metadata->>'title'='A goal'
  and metadata->>'goal_id'='20000000-0000-4000-8000-000000000001'), 'completion snapshot survives goal deletion') as ok;
select pg_temp.assert_true((select parent_id is null from public.goals where title='C goal'), 'parent deletion preserves child') as ok;
select pg_temp.assert_true((select count(*)=1 from public.goal_connections), 'goal deletion cascades its edges only') as ok;
delete from public.chapters where title='A chapter';
select pg_temp.assert_true((select count(*)=1 from public.progress_events where event_type='chapter_completed' and chapter_id is null and metadata->>'title'='A chapter'), 'chapter history survives deletion') as ok;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select pg_temp.assert_true((select count(*)=0 from public.goal_connections), 'other connections hidden') as ok;
with changed as (update public.goal_connections set connection_type='related' returning id)
select pg_temp.assert_true((select count(*)=0 from changed), 'other connections cannot be modified') as ok;
select pg_temp.assert_true((select title='B goal' from public.goals), 'other user data preserved') as ok;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select pg_temp.assert_error($q$select * from public.goals$q$, '42501', 'anonymous read rejected') as ok;
select pg_temp.assert_error($q$insert into public.goals(title) values ('anonymous')$q$, '42501', 'anonymous insert rejected') as ok;
reset role;
rollback;

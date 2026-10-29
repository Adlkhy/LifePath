begin;

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  parent_id uuid,
  name text not null check (length(btrim(name)) between 1 and 200),
  category text check (length(category) <= 200),
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced', 'expert')),
  notes text check (length(notes) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, parent_id) references public.skills(user_id, id) on delete set null (parent_id),
  check (parent_id is distinct from id)
);
create index skills_owner_parent_idx on public.skills(user_id, parent_id);
create index skills_owner_name_idx on public.skills(user_id, name, id);

create table public.skill_goals (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  skill_id uuid not null,
  goal_id uuid not null,
  primary key (user_id, skill_id, goal_id),
  foreign key (user_id, skill_id) references public.skills(user_id, id) on delete cascade,
  foreign key (user_id, goal_id) references public.goals(user_id, id) on delete cascade
);
create index skill_goals_goal_idx on public.skill_goals(user_id, goal_id);

create trigger a_prepare_skill before insert or update on public.skills
  for each row execute function private.prepare_record();

create function private.check_skill_cycle() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.parent_id is not distinct from old.parent_id then return new; end if;
  end if;
  if new.parent_id is null then return new; end if;
  -- Serialize graph writes per owner, including stale repeatable-read snapshots.
  update public.profiles set updated_at = now() where id = new.user_id;
  if exists (
    with recursive ancestors(id) as (
      select new.parent_id
      union
      select s.parent_id from public.skills s join ancestors a on s.id = a.id
      where s.user_id = new.user_id and s.parent_id is not null
    ) select 1 from ancestors where id = new.id
  ) then raise exception 'A skill cannot be its own ancestor' using errcode = '23514'; end if;
  return new;
end;
$$;
create trigger b_check_skill_cycle before insert or update on public.skills
  for each row execute function private.check_skill_cycle();
revoke all on function private.check_skill_cycle() from public, anon, authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['skills', 'skill_goals'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('create policy owner_access on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', table_name);
  end loop;
end;
$$;

-- A single transaction saves proficiency and replaces links. Goal status never
-- changes skill proficiency; it is explicitly self-assessed.
create function public.save_skill(skill_id uuid, skill_name text, skill_category text,
  parent_skill_id uuid, proficiency text, skill_notes text, goal_ids uuid[])
returns uuid language plpgsql security invoker set search_path = '' as $$
declare saved_id uuid; owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'Sign in to save skills' using errcode = '42501'; end if;
  update public.profiles set updated_at = now() where id = owner_id;
  if goal_ids is null or exists (
    select 1 from unnest(goal_ids) ids(id) where not exists (
      select 1 from public.goals g where g.id = ids.id and g.user_id = owner_id
    )
  ) then raise exception 'Choose your own goals or milestones' using errcode = '22023'; end if;
  if skill_id is null then
    insert into public.skills(name, category, parent_id, level, notes)
      values (skill_name, skill_category, parent_skill_id, proficiency, skill_notes) returning id into saved_id;
  else
    update public.skills s set name = skill_name, category = skill_category, parent_id = parent_skill_id,
      level = proficiency, notes = skill_notes where s.id = skill_id and s.user_id = owner_id returning s.id into saved_id;
    if saved_id is null then raise exception 'Skill not found' using errcode = '42501'; end if;
  end if;
  delete from public.skill_goals sg where sg.skill_id = saved_id and sg.user_id = owner_id;
  insert into public.skill_goals(skill_id, goal_id) select saved_id, id from (select distinct unnest(goal_ids) id) ids;
  return saved_id;
end;
$$;
revoke all on function public.save_skill(uuid, text, text, uuid, text, text, uuid[]) from public, anon;
grant execute on function public.save_skill(uuid, text, text, uuid, text, text, uuid[]) to authenticated;

create index progress_completion_owner_idx on public.progress_events(user_id, created_at)
  where event_type in ('goal_completed', 'milestone_achieved', 'chapter_completed');

-- At most 366 daily aggregates cross the network. Deduplicate across ALL history
-- before applying the window, so reopens, duplicate imports and year navigation
-- cannot count one entity again. Snapshot IDs retain history of deleted records.
create function public.progress_activity(from_day date, until_day date, timezone_name text)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to view activity' using errcode = '42501'; end if;
  if from_day is null or until_day is null or until_day <= from_day or until_day - from_day > 366
    or timezone_name is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = timezone_name) then
    raise exception 'Choose a valid timezone and a window of at most 366 days' using errcode = '22023';
  end if;
  with candidates as (
    select case when event_type = 'chapter_completed' then 'chapter' else 'goal' end as kind,
      case when event_type = 'chapter_completed' then coalesce(chapter_id::text, nullif(metadata->>'chapter_id', ''))
        else coalesce(goal_id::text, nullif(metadata->>'goal_id', '')) end as entity_id,
      created_at
    from public.progress_events
    where user_id = (select auth.uid()) and event_type in ('goal_completed', 'milestone_achieved', 'chapter_completed')
      and created_at < (until_day::timestamp at time zone timezone_name)
  ), first_completions as (
    select kind, entity_id, min(created_at) as happened_at from candidates
    where entity_id is not null group by kind, entity_id
  ), days as (
    select (happened_at at time zone timezone_name)::date as day,
      count(*)::int as activity_count,
      count(*) filter (where kind = 'goal')::int as goal_count,
      count(*) filter (where kind = 'chapter')::int as chapter_count
    from first_completions
    where happened_at >= (from_day::timestamp at time zone timezone_name)
    group by 1
  ) select coalesce(jsonb_agg(to_jsonb(days) order by day), '[]'::jsonb) into result from days;
  return result;
end;
$$;
revoke all on function public.progress_activity(date, date, text) from public, anon;
grant execute on function public.progress_activity(date, date, text) to authenticated;

commit;

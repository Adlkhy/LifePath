-- PostgreSQL 15+ (column-specific ON DELETE SET NULL). Apply as the migration owner.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  description text,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed', 'archived')),
  start_date date,
  end_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  chapter_id uuid,
  parent_id uuid,
  type text not null default 'goal' check (type in ('vision', 'goal', 'milestone', 'quest')),
  title text not null check (length(btrim(title)) > 0),
  description text,
  motivation text,
  success_criteria text,
  category text,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed', 'paused', 'abandoned')),
  priority integer,
  target_date date,
  completed_at timestamptz,
  position_x numeric not null default 0,
  position_y numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, chapter_id) references public.chapters(user_id, id) on delete set null (chapter_id),
  foreign key (user_id, parent_id) references public.goals(user_id, id) on delete set null (parent_id),
  check (parent_id is distinct from id),
  check ((status = 'completed') = (completed_at is not null))
);

create table public.goal_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  source_goal_id uuid not null,
  target_goal_id uuid not null,
  connection_type text not null default 'prerequisite' check (connection_type in ('prerequisite', 'related')),
  created_at timestamptz not null default now(),
  foreign key (user_id, source_goal_id) references public.goals(user_id, id) on delete cascade,
  foreign key (user_id, target_goal_id) references public.goals(user_id, id) on delete cascade,
  check (source_goal_id <> target_goal_id),
  unique (user_id, source_goal_id, target_goal_id, connection_type)
);
-- Related edges are undirected: A--B and B--A are the same relationship.
create unique index connections_related_pair_idx on public.goal_connections
  (user_id, least(source_goal_id, target_goal_id), greatest(source_goal_id, target_goal_id))
  where connection_type = 'related';

create table public.progress_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  goal_id uuid,
  chapter_id uuid,
  event_type text not null check (length(btrim(event_type)) > 0),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (user_id, goal_id) references public.goals(user_id, id) on delete set null (goal_id),
  foreign key (user_id, chapter_id) references public.chapters(user_id, id) on delete set null (chapter_id)
);

create index chapters_owner_order_idx on public.chapters(user_id, sort_order);
create index goals_owner_status_idx on public.goals(user_id, status);
create index goals_chapter_idx on public.goals(user_id, chapter_id);
create index goals_parent_idx on public.goals(user_id, parent_id);
create index goals_owner_created_idx on public.goals(user_id, created_at desc, id);
create index connections_target_idx on public.goal_connections(user_id, target_goal_id);
create index progress_owner_created_idx on public.progress_events(user_id, created_at desc, id);
create index progress_goal_idx on public.progress_events(user_id, goal_id);
create index progress_chapter_idx on public.progress_events(user_id, chapter_id);

create function private.prepare_record() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
      raise exception 'Record identity and creation time are immutable' using errcode = '23514';
    end if;
    if tg_table_name <> 'profiles' then
      if new.user_id is distinct from old.user_id then
        raise exception 'Record ownership is immutable' using errcode = '23514';
      end if;
    end if;
  else
    new.created_at := now();
  end if;
  if tg_table_name <> 'goal_connections' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger a_prepare_profile before insert or update on public.profiles
  for each row execute function private.prepare_record();
create trigger a_prepare_chapter before insert or update on public.chapters
  for each row execute function private.prepare_record();
create trigger a_prepare_goal before insert or update on public.goals
  for each row execute function private.prepare_record();
create trigger a_prepare_connection before insert or update on public.goal_connections
  for each row execute function private.prepare_record();

create function private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
create trigger lifepath_create_profile after insert on auth.users
  for each row execute function private.create_profile();
-- Support accounts created before this migration.
insert into public.profiles(id) select id from auth.users on conflict (id) do nothing;

create function private.prepare_goal() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'completed' then
    if tg_op = 'INSERT' then
      new.completed_at := now();
    elsif old.status <> 'completed' then
      new.completed_at := now();
    else
      new.completed_at := old.completed_at;
    end if;
  else
    new.completed_at := null;
  end if;

  if tg_op = 'UPDATE' then
    if new.parent_id is not distinct from old.parent_id then return new; end if;
  end if;
  if new.parent_id is null then return new; end if;

  -- A real row write serializes graph additions per owner. Unlike advisory locks
  -- alone, this also forces stale REPEATABLE READ transactions to fail/retry.
  update public.profiles set updated_at = now() where id = new.user_id;
  if exists (
    with recursive ancestors(id) as (
      select new.parent_id
      union
      select g.parent_id from public.goals g join ancestors a on g.id = a.id
      where g.user_id = new.user_id and g.parent_id is not null
    ) select 1 from ancestors where id = new.id
  ) then
    raise exception 'A goal cannot be its own ancestor' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger b_prepare_goal before insert or update on public.goals
  for each row execute function private.prepare_goal();

create function private.check_prerequisite_cycle() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.connection_type <> 'prerequisite' then return new; end if;
  if tg_op = 'UPDATE' then
    if (new.source_goal_id, new.target_goal_id, new.connection_type)
       is not distinct from (old.source_goal_id, old.target_goal_id, old.connection_type) then
      return new;
    end if;
  end if;

  update public.profiles set updated_at = now() where id = new.user_id;
  -- source is a prerequisite OF target. A path target -> source would close a cycle.
  if exists (
    with recursive reachable(id) as (
      select new.target_goal_id
      union
      select c.target_goal_id from public.goal_connections c
      join reachable r on c.source_goal_id = r.id
      where c.user_id = new.user_id and c.connection_type = 'prerequisite' and c.id <> new.id
    ) select 1 from reachable where id = new.source_goal_id
  ) then
    raise exception 'Circular prerequisite dependencies are not allowed' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger b_check_prerequisite_cycle before insert or update on public.goal_connections
  for each row execute function private.check_prerequisite_cycle();

create function private.record_goal_status() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  previous_status text;
  kind text;
begin
  if tg_op = 'UPDATE' then
    if new.status is not distinct from old.status then return new; end if;
    previous_status := old.status;
  end if;
  if new.status = 'completed' then
    kind := case when new.type = 'milestone' then 'milestone_achieved' else 'goal_completed' end;
  elsif new.status = 'abandoned' then
    kind := 'goal_abandoned';
  elsif previous_status = 'completed' then
    kind := 'goal_reopened';
  end if;
  if kind is not null then
    insert into public.progress_events(user_id, goal_id, chapter_id, event_type, metadata)
    values (new.user_id, new.id, new.chapter_id, kind, jsonb_build_object(
      'goal_id', new.id, 'chapter_id', new.chapter_id, 'title', new.title,
      'goal_type', new.type, 'previous_status', previous_status, 'status', new.status,
      'completed_at', new.completed_at));
  end if;
  return new;
end;
$$;
create trigger record_goal_status after insert or update on public.goals
  for each row execute function private.record_goal_status();

create function private.record_chapter_status() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  previous_status text;
  kind text;
begin
  if tg_op = 'UPDATE' then
    if new.status is not distinct from old.status then return new; end if;
    previous_status := old.status;
  end if;
  if new.status = 'completed' then kind := 'chapter_completed';
  elsif new.status = 'active' then kind := 'chapter_started';
  end if;
  if kind is not null then
    insert into public.progress_events(user_id, chapter_id, event_type, metadata)
    values (new.user_id, new.id, kind, jsonb_build_object(
      'chapter_id', new.id, 'title', new.title, 'previous_status', previous_status, 'status', new.status));
  end if;
  return new;
end;
$$;
create trigger record_chapter_status after insert or update on public.chapters
  for each row execute function private.record_chapter_status();

create function private.prepare_progress_event() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.created_at := now();
  -- Snapshot original references even for custom events before FK SET NULL later.
  new.metadata := new.metadata || jsonb_build_object('goal_id', new.goal_id, 'chapter_id', new.chapter_id);
  return new;
end;
$$;
create trigger prepare_progress_event before insert on public.progress_events
  for each row execute function private.prepare_progress_event();

alter table public.profiles enable row level security;
alter table public.chapters enable row level security;
alter table public.goals enable row level security;
alter table public.goal_connections enable row level security;
alter table public.progress_events enable row level security;

revoke all on public.profiles, public.chapters, public.goals, public.goal_connections, public.progress_events from public, anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.chapters, public.goals, public.goal_connections to authenticated;
grant select, insert on public.progress_events to authenticated;

create policy profiles_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy chapters_select on public.chapters for select to authenticated using (user_id = (select auth.uid()));
create policy chapters_insert on public.chapters for insert to authenticated with check (user_id = (select auth.uid()));
create policy chapters_update on public.chapters for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy chapters_delete on public.chapters for delete to authenticated using (user_id = (select auth.uid()));

create policy goals_select on public.goals for select to authenticated using (user_id = (select auth.uid()));
create policy goals_insert on public.goals for insert to authenticated with check (user_id = (select auth.uid()));
create policy goals_update on public.goals for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy goals_delete on public.goals for delete to authenticated using (user_id = (select auth.uid()));

create policy connections_select on public.goal_connections for select to authenticated using (user_id = (select auth.uid()));
create policy connections_insert on public.goal_connections for insert to authenticated with check (user_id = (select auth.uid()));
create policy connections_update on public.goal_connections for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy connections_delete on public.goal_connections for delete to authenticated using (user_id = (select auth.uid()));

create policy progress_select on public.progress_events for select to authenticated using (user_id = (select auth.uid()));
create policy progress_insert on public.progress_events for insert to authenticated
  with check (user_id = (select auth.uid()) and event_type like 'custom.%' and length(event_type) > 7);
-- No UPDATE/DELETE grants or policies. Only owner-run FK actions may detach
-- deleted entities; snapshots remain. Account deletion intentionally erases data.

-- Trigger-only functions: no client RPC execution, fixed empty search_path.
revoke all on all functions in schema private from public, anon, authenticated;

commit;

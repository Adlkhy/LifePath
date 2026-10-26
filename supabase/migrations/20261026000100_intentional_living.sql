begin;

create table public.personal_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 200),
  description text not null default '' check (length(description) <= 20000),
  guiding_principle text check (length(guiding_principle) <= 20000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);
create index values_owner_order_idx on public.personal_values(user_id, sort_order, id);

create table public.value_goals (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  value_id uuid not null,
  goal_id uuid not null,
  primary key (user_id, value_id, goal_id),
  foreign key (user_id, value_id) references public.personal_values(user_id, id) on delete cascade,
  foreign key (user_id, goal_id) references public.goals(user_id, id) on delete cascade
);
create index value_goals_goal_idx on public.value_goals(user_id, goal_id);

-- Membership only: title, category, target date, completion and memories stay on goals.
create table public.bucket_list_items (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  goal_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, goal_id),
  foreign key (user_id, goal_id) references public.goals(user_id, id) on delete cascade
);

create table public.daily_priorities (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  priority_date date not null,
  slot integer not null check (slot between 1 and 3),
  goal_id uuid not null,
  primary key (user_id, priority_date, slot),
  unique (user_id, priority_date, goal_id),
  foreign key (user_id, goal_id) references public.goals(user_id, id) on delete cascade
);
create index daily_priorities_goal_idx on public.daily_priorities(user_id, goal_id);

create table public.goal_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  period_type text not null check (period_type in ('weekly', 'monthly')),
  period_start date not null,
  went_well text not null default '' check (length(went_well) <= 20000),
  didnt_go_as_planned text not null default '' check (length(didnt_go_as_planned) <= 20000),
  next_focus text not null default '' check (length(next_focus) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_type, period_start),
  check ((period_type = 'weekly' and extract(isodow from period_start) = 1)
    or (period_type = 'monthly' and extract(day from period_start) = 1))
);

create trigger a_prepare_value before insert or update on public.personal_values
  for each row execute function private.prepare_record();
create trigger a_prepare_review before insert or update on public.goal_reviews
  for each row execute function private.prepare_record();

-- Same owner-only policy pattern as the existing domain tables. Composite foreign
-- keys additionally reject links to another user's records, even through RPCs.
do $$
declare table_name text;
begin
  foreach table_name in array array['personal_values', 'value_goals', 'bucket_list_items', 'daily_priorities', 'goal_reviews'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('create policy owner_access on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', table_name);
  end loop;
end;
$$;

-- Save a value and its associations together, so failures never leave partial edits.
create function public.save_personal_value(value_id uuid, value_name text, value_description text, principle text, goal_ids uuid[])
returns uuid language plpgsql security invoker set search_path = '' as $$
declare saved_id uuid; owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'Sign in to save values' using errcode = '42501'; end if;
  update public.profiles set updated_at = now() where id = owner_id;
  if goal_ids is null or exists (
    select 1 from unnest(goal_ids) as ids(id) where not exists (
      select 1 from public.goals g where g.id = ids.id and g.user_id = owner_id and g.type in ('vision', 'goal')
    )
  ) then raise exception 'Choose your own visions or goals' using errcode = '22023'; end if;
  if value_id is null then
    insert into public.personal_values(name, description, guiding_principle, sort_order)
    values (value_name, value_description, principle, (select coalesce(max(sort_order), -1) + 1 from public.personal_values where user_id = owner_id)) returning id into saved_id;
  else
    update public.personal_values set name = value_name, description = value_description, guiding_principle = principle
      where id = value_id and user_id = owner_id returning id into saved_id;
    if saved_id is null then raise exception 'Value not found' using errcode = '42501'; end if;
  end if;
  delete from public.value_goals vg where vg.value_id = saved_id and vg.user_id = owner_id;
  insert into public.value_goals(value_id, goal_id) select saved_id, id from (select distinct unnest(goal_ids) as id) ids;
  return saved_id;
end;
$$;

create function public.reorder_values(ordered_ids uuid[]) returns void
language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid(); owned_count integer;
begin
  if owner_id is null then raise exception 'Sign in to reorder values' using errcode = '42501'; end if;
  update public.profiles set updated_at = now() where id = owner_id;
  perform id from public.personal_values where user_id = owner_id order by id for update;
  select count(*) into owned_count from public.personal_values where user_id = owner_id;
  if ordered_ids is null or cardinality(ordered_ids) <> owned_count
    or (select count(distinct id) from unnest(ordered_ids) ids(id)) <> owned_count
    or exists (select 1 from unnest(ordered_ids) ids(id) where not exists (select 1 from public.personal_values v where v.id = ids.id and v.user_id = owner_id)) then
    raise exception 'Value list changed. Refresh and try again.' using errcode = '22023';
  end if;
  update public.personal_values v set sort_order = (p.ordinality - 1)::integer
    from unnest(ordered_ids) with ordinality p(id, ordinality) where v.id = p.id and v.user_id = owner_id;
end;
$$;

create function public.create_bucket_experience(experience_title text, experience_description text, experience_category text, experience_date date)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare saved_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to create experiences' using errcode = '42501'; end if;
  insert into public.goals(title, description, category, target_date, type)
    values (experience_title, experience_description, experience_category, experience_date, 'goal') returning id into saved_id;
  insert into public.bucket_list_items(goal_id) values (saved_id);
  return saved_id;
end;
$$;

-- Replace one day's ordered references atomically; previous days are untouched.
create function public.set_daily_priorities(day date, goal_ids uuid[]) returns void
language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'Sign in to choose priorities' using errcode = '42501'; end if;
  update public.profiles set updated_at = now() where id = owner_id;
  if day is null or goal_ids is null or cardinality(goal_ids) > 3
    or (select count(distinct id) from unnest(goal_ids) ids(id)) <> cardinality(goal_ids)
    or exists (select 1 from unnest(goal_ids) ids(id) where not exists (
      select 1 from public.goals g where g.id = ids.id and g.user_id = owner_id and g.type in ('goal', 'quest')
    )) then raise exception 'Choose up to three different goals or quests' using errcode = '22023'; end if;
  delete from public.daily_priorities where user_id = owner_id and priority_date = day;
  insert into public.daily_priorities(priority_date, slot, goal_id)
    select day, ordinality::integer, id from unnest(goal_ids) with ordinality ids(id, ordinality);
end;
$$;

revoke all on function public.save_personal_value(uuid, text, text, text, uuid[]), public.reorder_values(uuid[]), public.create_bucket_experience(text, text, text, date), public.set_daily_priorities(date, uuid[]) from public, anon;
grant execute on function public.save_personal_value(uuid, text, text, text, uuid[]), public.reorder_values(uuid[]), public.create_bucket_experience(text, text, text, date), public.set_daily_priorities(date, uuid[]) to authenticated;

commit;

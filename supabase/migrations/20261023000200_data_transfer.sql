begin;
-- Only this owner-run RPC can enable import mode. A client-set GUC cannot bypass triggers.
create table private.import_context(transaction_id bigint primary key, user_id uuid not null);
create table private.import_records (
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null, source_id uuid not null, target_id uuid not null,
  primary key(user_id,kind,source_id)
);
revoke all on private.import_context,private.import_records from public,anon,authenticated;
create function private.importing() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from private.import_context where transaction_id=txid_current() and user_id=auth.uid());
$$;
create function private.remap(mapping jsonb, kind text, source text) returns uuid language plpgsql set search_path='' as $$
declare result uuid;
begin
  if source is null then return null; end if;
  result := (mapping->kind->>(source::uuid)::text)::uuid;
  if result is null then raise exception 'Import references a missing % record',kind using errcode='22023'; end if;
  return result;
end;
$$;
revoke all on function private.importing(),private.remap(jsonb,text,text) from public,anon,authenticated;

create function private.safe_metadata(value jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare result jsonb; item record;
begin
  if jsonb_typeof(value)='object' then
    result:='{}';
    for item in select * from jsonb_each(value) loop
      if item.key !~* '(token|secret|password|authorization|api.?key|signed.?url|credential)' then
        result:=result || jsonb_build_object(item.key,private.safe_metadata(item.value));
      end if;
    end loop;
    return result;
  elsif jsonb_typeof(value)='array' then
    select coalesce(jsonb_agg(private.safe_metadata(v)),'[]'::jsonb) into result from jsonb_array_elements(value) v;
    return result;
  elsif jsonb_typeof(value)='string' and value::text ~* '/storage/v1/' then
    return '"[private storage URL omitted]"'::jsonb;
  end if;
  return value;
end;
$$;
revoke all on function private.safe_metadata(jsonb) from public,anon,authenticated;

-- Explicit owner predicates on every table; definer access is needed for the private sanitizer.
create function public.export_lifepath() returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('schema_version',1,'exported_at',now(),
 'chapters',coalesce((select jsonb_agg(to_jsonb(c)-'user_id' order by id) from public.chapters c where user_id=auth.uid()),'[]'::jsonb),
 'goals',coalesce((select jsonb_agg(to_jsonb(g)-'user_id' order by id) from public.goals g where user_id=auth.uid()),'[]'::jsonb),
 'connections',coalesce((select jsonb_agg(to_jsonb(c)-'user_id' order by id) from public.goal_connections c where user_id=auth.uid()),'[]'::jsonb),
 'memories',coalesce((select jsonb_agg((to_jsonb(m)-'user_id'-'photo_path') || jsonb_build_object('has_photo',photo_path is not null) order by id) from public.memories m where user_id=auth.uid()),'[]'::jsonb),
 'progress_events',coalesce((select jsonb_agg((to_jsonb(e)-'user_id'-'metadata') || jsonb_build_object('metadata',private.safe_metadata(e.metadata)) order by id)
   from public.progress_events e where user_id=auth.uid()),'[]'::jsonb));
$$;
revoke all on function public.export_lifepath() from public,anon;
grant execute on function public.export_lifepath() to authenticated;

create function public.import_lifepath(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare
  owner_id uuid := auth.uid(); kind text; r jsonb; source_id uuid; target_id uuid;
  mapping jsonb := '{}'::jsonb; items jsonb; count_all integer:=0; seen_count integer; meta jsonb;
begin
  if owner_id is null then raise exception 'Sign in to import' using errcode='42501'; end if;
  if jsonb_typeof(payload) is distinct from 'object' or payload->>'schema_version' is distinct from '1'
    or octet_length(payload::text)>10485760 or payload->>'exported_at' is null then
    raise exception 'Unsupported or oversized backup' using errcode='22023';
  end if;
  perform (payload->>'exported_at')::timestamptz;
  -- Serialize imports for one owner, including concurrent requests and stale snapshots.
  update public.profiles set updated_at=now() where id=owner_id;
  if not found then raise exception 'Profile unavailable' using errcode='42501'; end if;
  foreach kind in array array['chapters','goals','connections','memories','progress_events'] loop
    items:=payload->kind;
    if jsonb_typeof(items) is distinct from 'array' then raise exception 'Missing % array',kind using errcode='22023'; end if;
    count_all:=count_all+jsonb_array_length(items);
    if count_all>10000 then raise exception 'Backup exceeds 10000 records' using errcode='22023'; end if;
    mapping:=jsonb_set(mapping,array[kind],'{}'::jsonb);
    for r in select value from jsonb_array_elements(items) loop
      if jsonb_typeof(r) is distinct from 'object' or r->>'id' is null or r->>'created_at' is null then raise exception 'Invalid record' using errcode='22023'; end if;
      source_id:=(r->>'id')::uuid;
      if mapping->kind ? source_id::text then raise exception 'Duplicate record ID in backup' using errcode='22023'; end if;
      if exists(select 1 from private.import_records where user_id=owner_id and import_records.kind=kind and (import_records.source_id=source_id or import_records.target_id=source_id)) then
        raise exception 'This backup overlaps a previous import; nothing was imported' using errcode='23505';
      end if;
      -- Same-account exports cannot accidentally be imported on top of existing records.
      if kind='chapters' then select count(*) into seen_count from public.chapters where user_id=owner_id and id=source_id;
      elsif kind='goals' then select count(*) into seen_count from public.goals where user_id=owner_id and id=source_id;
      elsif kind='connections' then select count(*) into seen_count from public.goal_connections where user_id=owner_id and id=source_id;
      elsif kind='memories' then select count(*) into seen_count from public.memories where user_id=owner_id and id=source_id;
      else select count(*) into seen_count from public.progress_events where user_id=owner_id and id=source_id;
      end if;
      if seen_count>0 then raise exception 'Backup contains records already in this account; nothing was imported' using errcode='23505'; end if;
      target_id:=gen_random_uuid();
      mapping:=jsonb_set(mapping,array[kind,source_id::text],to_jsonb(target_id::text));
      insert into private.import_records(user_id,kind,source_id,target_id) values(owner_id,kind,source_id,target_id);
    end loop;
  end loop;
  if count_all=0 then raise exception 'Backup is empty' using errcode='22023'; end if;
  insert into private.import_context values(txid_current(),owner_id);
  for r in select value from jsonb_array_elements(payload->'chapters') loop
    insert into public.chapters(id,user_id,title,description,status,start_date,end_date,sort_order,created_at,updated_at)
    values(private.remap(mapping,'chapters',r->>'id'),owner_id,r->>'title',r->>'description',r->>'status',
      (r->>'start_date')::date,(r->>'end_date')::date,(r->>'sort_order')::integer,(r->>'created_at')::timestamptz,(r->>'updated_at')::timestamptz);
  end loop;
  for r in select value from jsonb_array_elements(payload->'goals') loop
    insert into public.goals(id,user_id,chapter_id,type,title,description,motivation,success_criteria,category,status,priority,target_date,completed_at,position_x,position_y,created_at,updated_at)
    values(private.remap(mapping,'goals',r->>'id'),owner_id,private.remap(mapping,'chapters',r->>'chapter_id'),r->>'type',r->>'title',r->>'description',r->>'motivation',r->>'success_criteria',r->>'category',r->>'status',
      (r->>'priority')::integer,(r->>'target_date')::date,(r->>'completed_at')::timestamptz,(r->>'position_x')::numeric,(r->>'position_y')::numeric,(r->>'created_at')::timestamptz,(r->>'updated_at')::timestamptz);
  end loop;
  -- Resolve arbitrary parent ordering after all goals exist; cycle triggers still run.
  for r in select value from jsonb_array_elements(payload->'goals') where value->>'parent_id' is not null loop
    update public.goals set parent_id=private.remap(mapping,'goals',r->>'parent_id') where id=private.remap(mapping,'goals',r->>'id') and user_id=owner_id;
  end loop;
  for r in select value from jsonb_array_elements(payload->'connections') loop
    insert into public.goal_connections(id,user_id,source_goal_id,target_goal_id,connection_type,created_at)
    values(private.remap(mapping,'connections',r->>'id'),owner_id,private.remap(mapping,'goals',r->>'source_goal_id'),private.remap(mapping,'goals',r->>'target_goal_id'),r->>'connection_type',(r->>'created_at')::timestamptz);
  end loop;
  for r in select value from jsonb_array_elements(payload->'progress_events') loop
    if jsonb_typeof(r->'metadata') is distinct from 'object' then raise exception 'Invalid event metadata' using errcode='22023'; end if;
    -- Preserve custom history fields, redact credentials/Storage URLs, and remap snapshot references.
    meta:=private.safe_metadata(r->'metadata') || jsonb_build_object(
      'goal_id',coalesce(mapping->'goals'->>lower(r->'metadata'->>'goal_id'),r->'metadata'->>'goal_id'),
      'chapter_id',coalesce(mapping->'chapters'->>lower(r->'metadata'->>'chapter_id'),r->'metadata'->>'chapter_id'));
    insert into public.progress_events(id,user_id,goal_id,chapter_id,event_type,metadata,created_at)
    values(private.remap(mapping,'progress_events',r->>'id'),owner_id,private.remap(mapping,'goals',r->>'goal_id'),private.remap(mapping,'chapters',r->>'chapter_id'),r->>'event_type',meta,(r->>'created_at')::timestamptz);
  end loop;
  for r in select value from jsonb_array_elements(payload->'memories') loop
    insert into public.memories(id,user_id,goal_id,chapter_id,event_id,kind,title,description,memory_date,source_title,created_at,updated_at)
    values(private.remap(mapping,'memories',r->>'id'),owner_id,private.remap(mapping,'goals',r->>'goal_id'),private.remap(mapping,'chapters',r->>'chapter_id'),private.remap(mapping,'progress_events',r->>'event_id'),r->>'kind',r->>'title',r->>'description',(r->>'memory_date')::date,r->>'source_title',(r->>'created_at')::timestamptz,(r->>'updated_at')::timestamptz);
  end loop;
  delete from private.import_context where transaction_id=txid_current();
  return jsonb_build_object('imported',count_all,'photos_restored',false);
end;
$$;
revoke all on function public.import_lifepath(jsonb) from public,anon;
grant execute on function public.import_lifepath(jsonb) to authenticated;

-- Trigger replacements below preserve imported timestamps without disabling integrity checks.

create or replace function private.prepare_record() returns trigger
language plpgsql security definer set search_path = '' as $$
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
    if not private.importing() then new.created_at := now(); end if;
  end if;
  if tg_table_name <> 'goal_connections' and not private.importing() then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create or replace function private.prepare_goal() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not private.importing() then
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

create or replace function private.record_goal_status() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  previous_status text;
  kind text;
begin
  if private.importing() then return new; end if;
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

create or replace function private.record_chapter_status() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  previous_status text;
  kind text;
begin
  if private.importing() then return new; end if;
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

create or replace function private.prepare_progress_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if private.importing() then return new; end if;
  new.created_at := now();
  -- Snapshot original references even for custom events before FK SET NULL later.
  new.metadata := new.metadata || jsonb_build_object('goal_id', new.goal_id, 'chapter_id', new.chapter_id);
  return new;
end;
$$;

create or replace function private.memory_context() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if private.importing() then return new; end if;
  -- Retain the last known title when an attachment is deleted by FK actions.
  if new.event_id is not null then
    select left(metadata->>'title',1000) into new.source_title from public.progress_events where user_id=new.user_id and id=new.event_id;
  elsif new.goal_id is not null then
    select left(title,1000) into new.source_title from public.goals where user_id=new.user_id and id=new.goal_id;
  elsif new.chapter_id is not null then
    select left(title,1000) into new.source_title from public.chapters where user_id=new.user_id and id=new.chapter_id;
  end if;
  return new;
end;
$$;

revoke all on all functions in schema private from public,anon,authenticated;
commit;

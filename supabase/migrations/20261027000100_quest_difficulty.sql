begin;

-- Existing quests keep null; only subsequent inserts receive a default.
alter table public.goals add column difficulty text;
alter table public.goals alter column difficulty set default 'medium';
alter table public.goals add constraint goals_difficulty_valid
  check (difficulty is null or (type = 'quest' and difficulty in ('easy', 'medium', 'hard', 'legendary')));

create function private.prepare_goal_difficulty() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.type <> 'quest' then new.difficulty := null; end if;
  return new;
end;
$$;
create trigger c_prepare_goal_difficulty before insert or update on public.goals
  for each row execute function private.prepare_goal_difficulty();
revoke all on function private.prepare_goal_difficulty() from public, anon, authenticated;

-- The existing export already includes goal columns. Preserve difficulty on
-- import too, accepting old backups without a difficulty (as null). The rest
-- of the import transaction and its historical-event safeguards are unchanged.
create or replace function public.import_lifepath(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
    insert into public.goals(id,user_id,chapter_id,type,title,description,motivation,success_criteria,category,status,priority,target_date,completed_at,position_x,position_y,created_at,updated_at,difficulty)
    values(private.remap(mapping,'goals',r->>'id'),owner_id,private.remap(mapping,'chapters',r->>'chapter_id'),r->>'type',r->>'title',r->>'description',r->>'motivation',r->>'success_criteria',r->>'category',r->>'status',
      (r->>'priority')::integer,(r->>'target_date')::date,(r->>'completed_at')::timestamptz,(r->>'position_x')::numeric,(r->>'position_y')::numeric,(r->>'created_at')::timestamptz,(r->>'updated_at')::timestamptz,r->>'difficulty');
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

commit;

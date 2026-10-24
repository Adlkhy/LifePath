begin;
alter table public.progress_events add constraint progress_owner_id_unique unique (user_id, id);
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  goal_id uuid,
  chapter_id uuid,
  event_id uuid,
  kind text not null default 'memory' check (kind in ('memory','reflection')),
  title text not null check (length(btrim(title)) between 1 and 300),
  description text check (length(description) <= 20000),
  memory_date date not null default current_date,
  source_title text check (length(source_title) <= 1000),
  photo_path text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id,id),
  foreign key (user_id,goal_id) references public.goals(user_id,id) on delete set null (goal_id),
  foreign key (user_id,chapter_id) references public.chapters(user_id,id) on delete set null (chapter_id),
  foreign key (user_id,event_id) references public.progress_events(user_id,id) on delete set null (event_id),
  check (photo_path is null or photo_path ~ ('^' || user_id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$'))
);
create index memories_owner_date_idx on public.memories(user_id,memory_date desc,id);
create index memories_goal_idx on public.memories(user_id,goal_id);
create index memories_chapter_idx on public.memories(user_id,chapter_id);
create index memories_event_idx on public.memories(user_id,event_id);
create trigger a_prepare_memory before insert or update on public.memories for each row execute function private.prepare_record();
create function private.memory_context() returns trigger language plpgsql security definer set search_path = '' as $$
begin
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
create trigger b_memory_context before insert or update on public.memories for each row execute function private.memory_context();
revoke all on function private.memory_context() from public,anon,authenticated;
alter table public.memories enable row level security;
revoke all on public.memories from public,anon,authenticated;
grant select,insert,update,delete on public.memories to authenticated;
create policy memories_read on public.memories for select to authenticated using (user_id=(select auth.uid()));
create policy memories_create on public.memories for insert to authenticated with check (user_id=(select auth.uid()));
create policy memories_edit on public.memories for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy memories_delete on public.memories for delete to authenticated using (user_id=(select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('memory-photos','memory-photos',false,5242880,array['image/jpeg','image/png','image/webp']);
-- No UPDATE policy: uploads use unique immutable object names, never overwrite.
create policy memory_photos_read on storage.objects for select to authenticated
using (bucket_id='memory-photos' and split_part(name,'/',1)=(select auth.uid())::text);
create policy memory_photos_upload on storage.objects for insert to authenticated
with check (bucket_id='memory-photos' and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$'));
create policy memory_photos_delete on storage.objects for delete to authenticated
using (bucket_id='memory-photos' and split_part(name,'/',1)=(select auth.uid())::text
  and not exists(select 1 from public.memories m where m.photo_path=name));
commit;

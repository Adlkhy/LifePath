begin;

-- One transaction for the complete order. Invoker rights retain all existing RLS.
create function public.reorder_chapters(ordered_ids uuid[]) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  owned_count integer;
begin
  if owner_id is null then
    raise exception 'Sign in to reorder chapters' using errcode = '42501';
  end if;
  -- Serialize reorder requests by this user, including at repeatable-read isolation.
  update public.profiles set updated_at = now() where id = owner_id;
  perform id from public.chapters where user_id = owner_id order by id for update;
  select count(*) into owned_count from public.chapters where user_id = owner_id;

  if ordered_ids is null
     or cardinality(ordered_ids) <> owned_count
     or (select count(distinct id) from unnest(ordered_ids) as ids(id)) <> owned_count
     or exists (
       select 1 from unnest(ordered_ids) as ids(id)
       where not exists (select 1 from public.chapters c where c.id = ids.id and c.user_id = owner_id)
     ) then
    raise exception 'Chapter list changed. Refresh and try reordering again.' using errcode = '22023';
  end if;

  update public.chapters c set sort_order = (position.ordinality - 1)::integer
  from unnest(ordered_ids) with ordinality as position(id, ordinality)
  where c.id = position.id and c.user_id = owner_id;
end;
$$;

revoke all on function public.reorder_chapters(uuid[]) from public, anon;
grant execute on function public.reorder_chapters(uuid[]) to authenticated;
commit;

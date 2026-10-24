-- NULL means automatic placement; numeric coordinates (including 0,0) are saved placements.
-- Before Phase 4, the default 0,0 was the unpositioned sentinel.
begin;
alter table public.goals
  alter column position_x drop not null,
  alter column position_y drop not null,
  alter column position_x drop default,
  alter column position_y drop default;
update public.goals set position_x = null, position_y = null
where position_x = 0 and position_y = 0;
alter table public.goals add constraint goals_position_pair check (
  (position_x is null and position_y is null) or
  (position_x is not null and position_y is not null
    and position_x between -10000000 and 10000000
    and position_y between -10000000 and 10000000)
);
commit;

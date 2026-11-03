begin;

alter table public.profiles add column birthday date;
alter table public.profiles add constraint profiles_birthday_valid
  check (birthday is null or (birthday >= date '0001-01-01' and birthday <= current_date));

-- Nullable by default: existing profiles, grants, triggers and RLS remain intact.
comment on column public.profiles.birthday is 'Optional date of birth, without a time or timezone.';

commit;

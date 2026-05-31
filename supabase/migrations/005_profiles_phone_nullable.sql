alter table public.profiles alter column phone_e164 drop not null;

alter table public.profiles drop constraint if exists profiles_phone_e164_key;

create unique index if not exists profiles_phone_e164_unique_not_null
on public.profiles (phone_e164)
where phone_e164 is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, phone_e164)
  values (new.id, new.phone);
  return new;
end;
$$;

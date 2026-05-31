alter table public.profiles alter column role drop default;
alter table public.profiles alter column role drop not null;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('farmer', 'buyer', 'admin') or role is null);

update public.profiles set role = null where onboarded = false;

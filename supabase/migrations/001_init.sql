create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'farmer' check (role in ('farmer', 'buyer', 'admin')),
  phone_e164 text not null unique,
  display_name text,
  avatar_url text,
  region text,
  commune text,
  verified boolean not null default false,
  suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  crop_type text not null,
  description text,
  quantity numeric not null check (quantity > 0),
  unit text not null default 'kg',
  price_xaf integer not null check (price_xaf > 0),
  harvest_date date,
  expiry_date date,
  region text not null,
  commune text not null,
  location jsonb,
  image_urls text[] not null default '{}'::text[],
  status text not null default 'active' check (status in ('active', 'sold', 'expired', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  farmer_id uuid not null references public.profiles (id) on delete cascade,
  quantity numeric not null check (quantity > 0),
  price_xaf integer not null check (price_xaf > 0),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'fulfilled', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.market_prices (
  id uuid primary key default gen_random_uuid(),
  crop_type text not null,
  region text not null,
  price_xaf integer not null check (price_xaf > 0),
  captured_at timestamptz not null,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists listings_search_idx on public.listings using gin (
  to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(crop_type, ''))
);
create index if not exists listings_region_idx on public.listings (region);
create index if not exists listings_farmer_idx on public.listings (farmer_id);
create index if not exists orders_listing_idx on public.orders (listing_id);
create index if not exists orders_buyer_idx on public.orders (buyer_id);
create index if not exists orders_farmer_idx on public.orders (farmer_id);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
create index if not exists reviews_listing_idx on public.reviews (listing_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
before update on public.listings
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.orders enable row level security;
alter table public.market_prices enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.suspended = false
  );
$$;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (id = auth.uid());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles
for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "listings_select_public_active" on public.listings;
create policy "listings_select_public_active"
on public.listings
for select
using (status = 'active' or farmer_id = auth.uid() or public.is_admin());

drop policy if exists "listings_insert_farmer" on public.listings;
create policy "listings_insert_farmer"
on public.listings
for insert
with check (farmer_id = auth.uid());

drop policy if exists "listings_update_owner_or_admin" on public.listings;
create policy "listings_update_owner_or_admin"
on public.listings
for update
using (farmer_id = auth.uid() or public.is_admin())
with check (farmer_id = auth.uid() or public.is_admin());

drop policy if exists "listings_delete_owner_or_admin" on public.listings;
create policy "listings_delete_owner_or_admin"
on public.listings
for delete
using (farmer_id = auth.uid() or public.is_admin());

drop policy if exists "orders_select_participants" on public.orders;
create policy "orders_select_participants"
on public.orders
for select
using (buyer_id = auth.uid() or farmer_id = auth.uid() or public.is_admin());

drop policy if exists "orders_insert_buyer" on public.orders;
create policy "orders_insert_buyer"
on public.orders
for insert
with check (buyer_id = auth.uid());

drop policy if exists "orders_update_participants" on public.orders;
create policy "orders_update_participants"
on public.orders
for update
using (buyer_id = auth.uid() or farmer_id = auth.uid() or public.is_admin())
with check (buyer_id = auth.uid() or farmer_id = auth.uid() or public.is_admin());

drop policy if exists "market_prices_select_all" on public.market_prices;
create policy "market_prices_select_all"
on public.market_prices
for select
using (true);

drop policy if exists "market_prices_admin_write" on public.market_prices;
create policy "market_prices_admin_write"
on public.market_prices
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "messages_select_participants" on public.messages;
create policy "messages_select_participants"
on public.messages
for select
using (sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin());

drop policy if exists "messages_insert_sender" on public.messages;
create policy "messages_insert_sender"
on public.messages
for insert
with check (sender_id = auth.uid());

drop policy if exists "messages_update_participants" on public.messages;
create policy "messages_update_participants"
on public.messages
for update
using (sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin())
with check (sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin());

drop policy if exists "reviews_select_all" on public.reviews;
create policy "reviews_select_all"
on public.reviews
for select
using (true);

drop policy if exists "reviews_insert_reviewer" on public.reviews;
create policy "reviews_insert_reviewer"
on public.reviews
for insert
with check (reviewer_id = auth.uid());

drop policy if exists "reviews_admin_delete" on public.reviews;
create policy "reviews_admin_delete"
on public.reviews
for delete
using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

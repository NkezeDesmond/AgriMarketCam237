do $$
begin
  alter table if exists public.orders drop constraint if exists orders_status_check;
exception
  when undefined_table then null;
end $$;

update public.orders set status = 'confirmed' where status = 'accepted';
update public.orders set status = 'completed' where status = 'fulfilled';

alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'confirmed', 'in_transit', 'delivered', 'completed', 'disputed', 'rejected', 'cancelled'));

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists order_events_order_idx on public.order_events (order_id, created_at desc);

alter table public.order_events enable row level security;

drop policy if exists "order_events_select_participants" on public.order_events;
create policy "order_events_select_participants"
on public.order_events
for select
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and (o.buyer_id = auth.uid() or o.farmer_id = auth.uid() or public.is_admin())
  )
);

create or replace function public.transition_order_status(p_order_id uuid, p_next_status text, p_note text default null)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders;
  prev_status text;
  actor uuid;
  actor_is_admin boolean;
  is_buyer boolean;
  is_farmer boolean;
begin
  actor := auth.uid();
  if actor is null then
    raise exception 'Not authenticated';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  actor_is_admin := public.is_admin();
  is_buyer := (o.buyer_id = actor);
  is_farmer := (o.farmer_id = actor);

  if not (actor_is_admin or is_buyer or is_farmer) then
    raise exception 'Not allowed';
  end if;

  if o.status in ('rejected', 'cancelled', 'completed') then
    raise exception 'Order is closed';
  end if;

  if p_next_status not in ('pending', 'confirmed', 'in_transit', 'delivered', 'completed', 'disputed', 'rejected', 'cancelled') then
    raise exception 'Invalid status';
  end if;

  if actor_is_admin then
    null;
  elsif o.status = 'pending' then
    if is_farmer and p_next_status not in ('confirmed', 'rejected') then
      raise exception 'Invalid transition';
    end if;
    if is_buyer and p_next_status <> 'cancelled' then
      raise exception 'Invalid transition';
    end if;
  elsif o.status = 'confirmed' then
    if p_next_status = 'disputed' then
      null;
    elsif is_farmer and p_next_status = 'in_transit' then
      null;
    else
      raise exception 'Invalid transition';
    end if;
  elsif o.status = 'in_transit' then
    if p_next_status = 'disputed' then
      null;
    elsif is_buyer and p_next_status = 'delivered' then
      null;
    else
      raise exception 'Invalid transition';
    end if;
  elsif o.status = 'delivered' then
    if p_next_status = 'disputed' then
      null;
    elsif is_buyer and p_next_status = 'completed' then
      null;
    else
      raise exception 'Invalid transition';
    end if;
  elsif o.status = 'disputed' then
    if not actor_is_admin then
      raise exception 'Admin required';
    end if;
  end if;

  prev_status := o.status;
  update public.orders set status = p_next_status where id = p_order_id returning * into o;

  insert into public.order_events (order_id, actor_id, from_status, to_status, note)
  values (o.id, actor, prev_status, p_next_status, p_note);

  return o;
end;
$$;

revoke all on function public.transition_order_status(uuid, text, text) from public;
grant execute on function public.transition_order_status(uuid, text, text) to authenticated;


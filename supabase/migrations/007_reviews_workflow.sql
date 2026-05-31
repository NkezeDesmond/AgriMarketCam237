create or replace function public.admin_get_kpis(p_from timestamptz default null, p_to timestamptz default null)
returns table (
  total_users int,
  onboarded_users int,
  verified_users int,
  suspended_users int,
  total_listings int,
  active_listings int,
  hidden_listings int,
  total_orders int,
  disputed_orders int,
  completed_orders int,
  completed_gmv_xaf float8
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin required';
  end if;

  return query
  with orders_scoped as (
    select *
    from public.orders o
    where (p_from is null or o.created_at >= p_from)
      and (p_to is null or o.created_at < p_to)
  )
  select
    (select count(*)::int from public.profiles) as total_users,
    (select count(*)::int from public.profiles p where p.onboarded = true) as onboarded_users,
    (select count(*)::int from public.profiles p where p.verified = true) as verified_users,
    (select count(*)::int from public.profiles p where p.suspended = true) as suspended_users,
    (select count(*)::int from public.listings) as total_listings,
    (select count(*)::int from public.listings l where l.status = 'active') as active_listings,
    (select count(*)::int from public.listings l where l.status = 'hidden') as hidden_listings,
    (select count(*)::int from orders_scoped) as total_orders,
    (select count(*)::int from orders_scoped o where o.status = 'disputed') as disputed_orders,
    (select count(*)::int from orders_scoped o where o.status = 'completed') as completed_orders,
    (select coalesce(sum((o.price_xaf::numeric * o.quantity::numeric)), 0)::float8 from orders_scoped o where o.status = 'completed') as completed_gmv_xaf;
end;
$$;

revoke all on function public.admin_get_kpis(timestamptz, timestamptz) from public;
grant execute on function public.admin_get_kpis(timestamptz, timestamptz) to authenticated;


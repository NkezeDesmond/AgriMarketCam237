alter table public.orders
  add column if not exists payment_method text null,
  add column if not exists payment_status text not null default 'unpaid';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_payment_method_check') then
    alter table public.orders
      add constraint orders_payment_method_check
      check (payment_method is null or payment_method in ('mtn_momo', 'orange_money', 'mastercard'));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_payment_status_check') then
    alter table public.orders
      add constraint orders_payment_status_check
      check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded'));
  end if;
end $$;

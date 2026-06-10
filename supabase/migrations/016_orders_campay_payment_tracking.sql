alter table public.orders
  add column if not exists payment_provider text null,
  add column if not exists payment_reference text null,
  add column if not exists payment_external_reference text null,
  add column if not exists payment_phone_e164 text null,
  add column if not exists payment_error text null,
  add column if not exists payment_requested_at timestamptz null,
  add column if not exists payment_completed_at timestamptz null;

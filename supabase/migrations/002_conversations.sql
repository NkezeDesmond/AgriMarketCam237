create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_low uuid not null references public.profiles (id) on delete cascade,
  participant_high uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (participant_low, participant_high),
  check (participant_low <> participant_high)
);

alter table public.conversations enable row level security;

alter table public.messages
  add constraint messages_conversation_id_fkey
  foreign key (conversation_id) references public.conversations (id)
  on delete cascade;

drop policy if exists "conversations_select_participants" on public.conversations;
create policy "conversations_select_participants"
on public.conversations
for select
using (participant_low = auth.uid() or participant_high = auth.uid() or public.is_admin());

drop policy if exists "conversations_insert_participants" on public.conversations;
create policy "conversations_insert_participants"
on public.conversations
for insert
with check (participant_low = auth.uid() or participant_high = auth.uid() or public.is_admin());

drop policy if exists "conversations_update_admin" on public.conversations;
create policy "conversations_update_admin"
on public.conversations
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "conversations_delete_admin" on public.conversations;
create policy "conversations_delete_admin"
on public.conversations
for delete
using (public.is_admin());


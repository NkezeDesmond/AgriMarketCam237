drop policy if exists conversations_select_participants on public.conversations;
drop policy if exists conversations_insert_participants on public.conversations;
drop policy if exists messages_select_sender_or_recipient on public.messages;
drop policy if exists messages_insert_sender on public.messages;
drop policy if exists messages_update_participants on public.messages;

create policy conversations_select_participants
on public.conversations
for select
to authenticated
using (
  participant_low = auth.uid()
  or participant_high = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy conversations_insert_participants
on public.conversations
for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or (
    (participant_low = auth.uid() or participant_high = auth.uid())
    and exists (
      select 1
      from public.profiles p_low
      join public.profiles p_high on p_high.id = participant_high
      where p_low.id = participant_low
        and p_low.role in ('buyer', 'farmer')
        and p_high.role in ('buyer', 'farmer')
        and p_low.role <> p_high.role
    )
  )
);

create policy messages_select_sender_or_recipient
on public.messages
for select
to authenticated
using (
  sender_id = auth.uid()
  or recipient_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy messages_insert_sender
on public.messages
for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or (
    sender_id = auth.uid()
    and sender_id <> recipient_id
    and exists (
      select 1
      from public.conversations c
      join public.profiles p_low on p_low.id = c.participant_low
      join public.profiles p_high on p_high.id = c.participant_high
      where c.id = conversation_id
        and (sender_id = c.participant_low or sender_id = c.participant_high)
        and (recipient_id = c.participant_low or recipient_id = c.participant_high)
        and p_low.role in ('buyer', 'farmer')
        and p_high.role in ('buyer', 'farmer')
        and p_low.role <> p_high.role
    )
  )
);

create policy messages_update_participants
on public.messages
for update
to authenticated
using (
  sender_id = auth.uid()
  or recipient_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  sender_id = auth.uid()
  or recipient_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);


-- Server-enforced safety workflows added for the complete local product slice.

create or replace function public.can_invite_to_conversation(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and target <> auth.uid()
    and exists (
      select 1
      from public.profiles target_profile
      where target_profile.id = target
        and target_profile.status = 'active'
        and target_profile.allow_messages <> 'nobody'
        and not exists (
          select 1 from public.blocks b
          where (b.blocker_id = auth.uid() and b.blocked_id = target)
             or (b.blocker_id = target and b.blocked_id = auth.uid())
        )
        and (
          target_profile.allow_messages = 'everyone'
          or exists (
            select 1 from public.connections c
            where c.status = 'accepted'
              and ((c.requester_id = auth.uid() and c.addressee_id = target)
                or (c.requester_id = target and c.addressee_id = auth.uid()))
          )
        )
    )
$$;

drop policy if exists "members join conversations" on public.conversation_members;
create policy "eligible members join conversations"
on public.conversation_members
for insert
with check (
  profile_id = auth.uid()
  or (public.is_conversation_member(conversation_id) and public.can_invite_to_conversation(profile_id))
);

create or replace function public.enforce_message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) >= 30
    from public.messages
    where sender_id = new.sender_id
      and created_at > now() - interval '1 minute'
  ) then
    raise exception 'message rate limit exceeded';
  end if;
  return new;
end;
$$;

create trigger messages_rate_limit
before insert on public.messages
for each row execute function public.enforce_message_rate_limit();

create or replace function public.enforce_report_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) >= 20
    from public.reports
    where reporter_id = new.reporter_id
      and created_at > now() - interval '24 hours'
  ) then
    raise exception 'report rate limit exceeded';
  end if;
  return new;
end;
$$;

create trigger reports_rate_limit
before insert on public.reports
for each row execute function public.enforce_report_rate_limit();

create or replace function public.moderate_report(
  target_report_id uuid,
  decision public.report_status,
  action_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_report public.reports%rowtype;
begin
  if not public.is_admin() then
    raise exception 'administrator access required';
  end if;
  if decision not in ('resolved', 'dismissed') then
    raise exception 'invalid moderation decision';
  end if;
  if char_length(trim(action_reason)) < 3 then
    raise exception 'moderation reason required';
  end if;

  select * into selected_report
  from public.reports
  where id = target_report_id
  for update;

  if not found then raise exception 'report not found'; end if;

  update public.reports
  set status = decision,
      assigned_to = auth.uid(),
      resolved_at = now()
  where id = target_report_id;

  insert into public.moderation_actions (
    moderator_id, report_id, target_type, target_id, action, reason
  ) values (
    auth.uid(), selected_report.id, selected_report.target_type,
    selected_report.target_id, decision::text, trim(action_reason)
  );
end;
$$;

grant execute on function public.can_invite_to_conversation(uuid) to authenticated;
grant execute on function public.moderate_report(uuid, public.report_status, text) to authenticated;


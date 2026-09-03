-- Production data boundaries, atomic workflows, storage policy, and realtime events.

alter table public.profiles
  add column if not exists onboarded_at timestamptz,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists privacy_version text,
  add column if not exists nearby_alerts_enabled boolean not null default true;

alter table public.pets
  add column if not exists vaccinations_current_self_reported boolean;

alter table public.messages
  add column if not exists client_nonce uuid not null default gen_random_uuid();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'alerts_title_length') then
    alter table public.lost_found_alerts add constraint alerts_title_length check (char_length(trim(title)) between 3 and 100) not valid;
    alter table public.lost_found_alerts validate constraint alerts_title_length;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'alerts_description_length') then
    alter table public.lost_found_alerts add constraint alerts_description_length check (char_length(trim(description)) between 3 and 2000) not valid;
    alter table public.lost_found_alerts validate constraint alerts_description_length;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'alerts_neighborhood_length') then
    alter table public.lost_found_alerts add constraint alerts_neighborhood_length check (char_length(trim(neighborhood_label)) between 2 and 100) not valid;
    alter table public.lost_found_alerts validate constraint alerts_neighborhood_length;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'activity_private_instructions_length') then
    alter table public.activity_private_locations add constraint activity_private_instructions_length check (location_instructions is null or char_length(trim(location_instructions)) between 3 and 500) not valid;
    alter table public.activity_private_locations validate constraint activity_private_instructions_length;
  end if;
end
$$;

create unique index if not exists messages_sender_nonce_uidx
  on public.messages (sender_id, client_nonce);

create unique index if not exists connections_unordered_uidx
  on public.connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create table if not exists public.direct_conversations (
  conversation_id uuid primary key references public.conversations(id) on delete cascade,
  first_profile_id uuid not null references public.profiles(id) on delete cascade,
  second_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (first_profile_id < second_profile_id),
  unique (first_profile_id, second_profile_id)
);

create table if not exists public.alert_sightings (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.lost_found_alerts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  description text not null check (char_length(description) between 3 and 1000),
  approximate_location extensions.geography(point, 4326),
  neighborhood_label text,
  created_at timestamptz not null default now()
);

create index if not exists alert_sightings_alert_idx on public.alert_sightings (alert_id, created_at desc);

alter table public.direct_conversations enable row level security;
alter table public.alert_sightings enable row level security;

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and status = 'active' and onboarded_at is not null)
$$;

create or replace function public.has_block_between(first_profile uuid, second_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (auth.uid() = first_profile or auth.uid() = second_profile or public.is_admin()) and exists (
    select 1 from public.blocks b
    where (b.blocker_id = first_profile and b.blocked_id = second_profile)
       or (b.blocker_id = second_profile and b.blocked_id = first_profile)
  )
$$;

create or replace function public.can_access_conversation(target_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members mine
    where mine.conversation_id = target_conversation
      and mine.profile_id = auth.uid()
  ) and not exists (
    select 1
    from public.conversation_members other_member
    where other_member.conversation_id = target_conversation
      and other_member.profile_id <> auth.uid()
      and public.has_block_between(auth.uid(), other_member.profile_id)
  )
$$;

create or replace function public.complete_onboarding(
  pet_id uuid,
  display_name text,
  requested_handle text,
  selected_interests text[],
  adult_confirmed boolean,
  accepted_terms_version text,
  accepted_privacy_version text,
  neighborhood_label text,
  city_label text,
  profile_country_code text,
  latitude double precision,
  longitude double precision,
  pet_name text,
  pet_species public.pet_species
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  clean_name text := trim(display_name);
  clean_handle text := lower(trim(leading '@' from requested_handle));
  clean_pet_name text := trim(pet_name);
begin
  if caller is null then raise exception 'authentication required'; end if;
  if exists (select 1 from public.profiles p where p.id = caller and p.status <> 'active') then
    raise exception 'account unavailable';
  end if;
  if not adult_confirmed then raise exception 'adult confirmation required'; end if;
  if char_length(clean_name) not between 2 and 60 then raise exception 'invalid display name'; end if;
  if clean_handle !~ '^[a-z0-9_.]{3,30}$' then raise exception 'invalid handle'; end if;
  if char_length(clean_pet_name) not between 1 and 50 then raise exception 'invalid pet name'; end if;
  if nullif(trim(accepted_terms_version), '') is null or nullif(trim(accepted_privacy_version), '') is null then
    raise exception 'terms and privacy acceptance required';
  end if;
  if profile_country_code is not null and char_length(profile_country_code) <> 2 then
    raise exception 'invalid country code';
  end if;
  if (latitude is null) <> (longitude is null) then raise exception 'latitude and longitude must be supplied together'; end if;
  if latitude is not null and (latitude not between -90 and 90 or longitude not between -180 and 180) then
    raise exception 'invalid coordinates';
  end if;

  insert into public.profiles (
    id, display_name, handle, neighborhood, city, country_code, interests,
    is_adult, onboarded_at, terms_accepted_at, terms_version,
    privacy_accepted_at, privacy_version, approximate_location
  ) values (
    caller, clean_name, clean_handle, nullif(trim(neighborhood_label), ''),
    nullif(trim(city_label), ''), upper(nullif(trim(profile_country_code), '')),
    coalesce(selected_interests, '{}'), true, now(), now(), accepted_terms_version,
    now(), accepted_privacy_version,
    case when latitude is null then null else
      extensions.st_point(round(longitude::numeric, 2)::double precision, round(latitude::numeric, 2)::double precision)::extensions.geography
    end
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    handle = excluded.handle,
    neighborhood = excluded.neighborhood,
    city = excluded.city,
    country_code = excluded.country_code,
    interests = excluded.interests,
    is_adult = true,
    onboarded_at = coalesce(public.profiles.onboarded_at, now()),
    terms_accepted_at = now(),
    terms_version = excluded.terms_version,
    privacy_accepted_at = now(),
    privacy_version = excluded.privacy_version,
    approximate_location = excluded.approximate_location,
    updated_at = now();

  if latitude is not null then
    insert into public.private_locations (profile_id, exact_location, updated_at)
    values (caller, extensions.st_point(longitude, latitude)::extensions.geography, now())
    on conflict (profile_id) do update set exact_location = excluded.exact_location, updated_at = now();
  end if;

  if exists (select 1 from public.pets p where p.id = pet_id and p.owner_id <> caller) then
    raise exception 'invalid pet id';
  end if;

  insert into public.pets (id, owner_id, name, species)
  values (pet_id, caller, clean_pet_name, pet_species)
  on conflict (id) do update set name = excluded.name, species = excluded.species, updated_at = now()
  where public.pets.owner_id = caller;

  return pet_id;
end;
$$;

create or replace function public.set_my_location(
  latitude double precision,
  longitude double precision,
  neighborhood_label text,
  city_label text,
  profile_country_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare caller uuid := auth.uid();
begin
  if caller is null then raise exception 'authentication required'; end if;
  if not public.is_active_member() then raise exception 'active member access required'; end if;
  if latitude not between -90 and 90 or longitude not between -180 and 180 then raise exception 'invalid coordinates'; end if;

  insert into public.private_locations (profile_id, exact_location, updated_at)
  values (caller, extensions.st_point(longitude, latitude)::extensions.geography, now())
  on conflict (profile_id) do update set exact_location = excluded.exact_location, updated_at = now();

  update public.profiles set
    approximate_location = extensions.st_point(
      round(longitude::numeric, 2)::double precision,
      round(latitude::numeric, 2)::double precision
    )::extensions.geography,
    neighborhood = nullif(trim(neighborhood_label), ''),
    city = nullif(trim(city_label), ''),
    country_code = upper(nullif(trim(profile_country_code), '')),
    updated_at = now()
  where id = caller;
end;
$$;

create or replace function public.clear_my_location()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not public.is_active_member() then raise exception 'active member access required'; end if;
  delete from public.private_locations where profile_id = auth.uid();
  update public.profiles set approximate_location = null, is_discoverable = false, updated_at = now() where id = auth.uid();
end;
$$;

create or replace function public.attach_my_alert_photo(target_alert uuid, storage_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_member() then raise exception 'active member access required'; end if;
  if split_part(storage_path, '/', 1) <> auth.uid()::text then raise exception 'media path owner mismatch'; end if;
  update public.lost_found_alerts set photo_path = storage_path, updated_at = now()
  where id = target_alert and creator_id = auth.uid() and status = 'active';
  if not found then raise exception 'alert unavailable'; end if;
end;
$$;

create or replace function public.resolve_my_alert(target_alert uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_member() then raise exception 'active member access required'; end if;
  update public.lost_found_alerts set resolved_at = now(), is_urgent = false, updated_at = now()
  where id = target_alert and creator_id = auth.uid() and status = 'active' and resolved_at is null;
  if not found then raise exception 'active alert unavailable'; end if;
end;
$$;

create or replace function public.delete_my_alert(target_alert uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.lost_found_alerts where id = target_alert and creator_id = auth.uid();
  if not found then raise exception 'alert unavailable'; end if;
end;
$$;

create or replace function public.cancel_my_activity(target_activity uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.activities where id = target_activity and host_id = auth.uid();
  if not found then raise exception 'activity unavailable'; end if;
end;
$$;

create or replace function public.register_device_token(push_token text, device_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not public.is_active_member() then raise exception 'active member access required'; end if;
  if device_platform not in ('ios', 'android', 'web') then raise exception 'invalid device platform'; end if;
  if push_token !~ '^Expo(nent)?PushToken\\[[A-Za-z0-9_-]+\\]$' then raise exception 'invalid push token'; end if;
  insert into public.device_tokens (profile_id, token, platform, enabled, updated_at)
  values (auth.uid(), push_token, device_platform, true, now())
  on conflict (token) do update set profile_id = auth.uid(), platform = excluded.platform, enabled = true, updated_at = now();
end;
$$;

create or replace function public.disable_my_device_token(push_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.device_tokens set enabled = false, updated_at = now() where profile_id = auth.uid() and token = push_token
$$;

-- Nearby discovery derives distance from the caller's private point. Arbitrary coordinate probing is not exposed.
revoke execute on function public.nearby_profiles(double precision, double precision, integer) from authenticated;

create or replace function public.nearby_profiles_for_me(radius_meters integer default 10000, result_limit integer default 50)
returns table (
  id uuid,
  display_name text,
  handle text,
  avatar_path text,
  neighborhood text,
  verification_status public.verification_status,
  distance_meters double precision,
  connected boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with origin as (
    select exact_location from public.private_locations where profile_id = auth.uid()
  )
  select p.id, p.display_name, p.handle, p.avatar_path, p.neighborhood, p.verification_status,
    ceil(extensions.st_distance(p.approximate_location, origin.exact_location) / 500.0) * 500.0 as distance_meters,
    exists (
      select 1 from public.connections c where c.status = 'accepted'
        and ((c.requester_id = auth.uid() and c.addressee_id = p.id)
          or (c.requester_id = p.id and c.addressee_id = auth.uid()))
    ) as connected
  from public.profiles p
  cross join origin
  where public.is_active_member()
    and p.id <> auth.uid()
    and p.is_discoverable
    and p.status = 'active'
    and p.approximate_location is not null
    and not public.has_block_between(auth.uid(), p.id)
    and extensions.st_dwithin(p.approximate_location, origin.exact_location, least(greatest(radius_meters, 500), 50000))
  order by distance_meters
  limit least(greatest(result_limit, 1), 100)
$$;

create or replace function public.request_connection(target_profile uuid)
returns public.connections
language plpgsql
security definer
set search_path = ''
as $$
declare created public.connections;
begin
  if auth.uid() is null or target_profile = auth.uid() then raise exception 'invalid connection target'; end if;
  if not public.is_active_member() then raise exception 'active member access required'; end if;
  if public.has_block_between(auth.uid(), target_profile) then raise exception 'connection unavailable'; end if;
  if not exists (select 1 from public.profiles p where p.id = target_profile and p.status = 'active' and p.is_discoverable) then
    raise exception 'profile unavailable';
  end if;
  if exists (
    select 1 from public.connections c
    where (c.requester_id = auth.uid() and c.addressee_id = target_profile)
       or (c.requester_id = target_profile and c.addressee_id = auth.uid())
  ) then raise exception 'connection already exists'; end if;

  insert into public.connections (requester_id, addressee_id)
  values (auth.uid(), target_profile)
  returning * into created;
  return created;
end;
$$;

create or replace function public.respond_to_connection(requester_profile uuid, decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_member() then raise exception 'active member access required'; end if;
  if decision not in ('accepted', 'declined') then raise exception 'invalid decision'; end if;
  update public.connections
  set status = decision, updated_at = now()
  where requester_id = requester_profile and addressee_id = auth.uid() and status = 'pending';
  if not found then raise exception 'pending request not found'; end if;
end;
$$;

create or replace function public.request_activity_attendance(target_activity uuid, selected_pet uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare selected_activity public.activities%rowtype;
begin
  if not public.is_active_member() then raise exception 'active member access required'; end if;
  select * into selected_activity from public.activities where id = target_activity and status = 'active' for update;
  if not found or selected_activity.starts_at <= now() then raise exception 'activity unavailable'; end if;
  if selected_activity.host_id = auth.uid() then raise exception 'host cannot request attendance'; end if;
  if public.has_block_between(auth.uid(), selected_activity.host_id) then raise exception 'activity unavailable'; end if;
  if selected_pet is not null and not exists (select 1 from public.pets where id = selected_pet and owner_id = auth.uid()) then
    raise exception 'pet unavailable';
  end if;
  insert into public.activity_attendance (activity_id, profile_id, pet_id, status)
  values (target_activity, auth.uid(), selected_pet, 'pending')
  on conflict (activity_id, profile_id) do update set pet_id = excluded.pet_id, status = 'pending', updated_at = now()
  where public.activity_attendance.status in ('declined', 'cancelled');
end;
$$;

create or replace function public.respond_to_activity_attendance(target_activity uuid, attendee_profile uuid, decision public.attendance_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare selected_activity public.activities%rowtype;
declare approved_count integer;
begin
  if not public.is_active_member() then raise exception 'active member access required'; end if;
  if decision not in ('approved', 'declined') then raise exception 'invalid attendance decision'; end if;
  select * into selected_activity from public.activities where id = target_activity for update;
  if not found or selected_activity.host_id <> auth.uid() then raise exception 'host access required'; end if;
  if decision = 'approved' then
    select count(*) into approved_count from public.activity_attendance where activity_id = target_activity and status = 'approved';
    if approved_count >= selected_activity.capacity then raise exception 'activity is full'; end if;
  end if;
  update public.activity_attendance set status = decision, updated_at = now()
  where activity_id = target_activity and profile_id = attendee_profile and status = 'pending';
  if not found then raise exception 'pending request not found'; end if;
end;
$$;

create or replace function public.ensure_direct_conversation(target_profile uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare first_id uuid := least(auth.uid(), target_profile);
declare second_id uuid := greatest(auth.uid(), target_profile);
declare selected_conversation uuid;
begin
  if auth.uid() is null or target_profile = auth.uid() then raise exception 'invalid conversation target'; end if;
  if not public.is_active_member() then raise exception 'active member access required'; end if;
  if not public.can_invite_to_conversation(target_profile) then raise exception 'messaging unavailable'; end if;

  select conversation_id into selected_conversation
  from public.direct_conversations
  where first_profile_id = first_id and second_profile_id = second_id;

  if selected_conversation is null then
    insert into public.conversations default values returning id into selected_conversation;
    insert into public.direct_conversations (conversation_id, first_profile_id, second_profile_id)
    values (selected_conversation, first_id, second_id);
    insert into public.conversation_members (conversation_id, profile_id)
    values (selected_conversation, first_id), (selected_conversation, second_id);
  end if;
  return selected_conversation;
end;
$$;

create or replace function public.create_activity_for_me(
  activity_kind public.activity_type,
  activity_title text,
  activity_description text,
  activity_starts_at timestamptz,
  activity_capacity integer,
  neighborhood_label text,
  meeting_instructions text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare created_id uuid;
declare coarse_location extensions.geography(point, 4326);
begin
  if not public.is_active_member() then raise exception 'active member access required'; end if;
  select approximate_location into coarse_location from public.profiles where id = auth.uid() and onboarded_at is not null;
  if activity_starts_at <= now() then raise exception 'activity must start in the future'; end if;
  insert into public.activities (host_id, type, title, description, starts_at, capacity, neighborhood_label, approximate_location)
  values (auth.uid(), activity_kind, trim(activity_title), trim(activity_description), activity_starts_at,
    least(greatest(activity_capacity, 2), 500), trim(neighborhood_label), coarse_location)
  returning id into created_id;
  if nullif(trim(meeting_instructions), '') is not null then
    insert into public.activity_private_locations (activity_id, location_instructions)
    values (created_id, left(trim(meeting_instructions), 500));
  end if;
  return created_id;
end;
$$;

create or replace function public.create_lost_found_alert_for_me(
  alert_kind public.alert_kind,
  alert_title text,
  alert_description text,
  neighborhood_label text,
  last_seen_at timestamptz,
  urgent boolean,
  selected_pet uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare created_id uuid;
declare coarse_location extensions.geography(point, 4326);
begin
  if not public.is_active_member() then raise exception 'active member access required'; end if;
  select approximate_location into coarse_location from public.profiles where id = auth.uid();
  if coarse_location is null then raise exception 'set an approximate location before publishing an alert'; end if;
  if selected_pet is not null and not exists (select 1 from public.pets where id = selected_pet and owner_id = auth.uid()) then
    raise exception 'pet unavailable';
  end if;
  insert into public.lost_found_alerts (
    creator_id, pet_id, kind, title, description, last_seen_at,
    approximate_location, neighborhood_label, is_urgent
  ) values (
    auth.uid(), selected_pet, alert_kind, trim(alert_title), trim(alert_description), last_seen_at,
    coarse_location, trim(neighborhood_label), alert_kind = 'lost' and urgent
  ) returning id into created_id;
  return created_id;
end;
$$;

create or replace function public.report_alert_sighting(target_alert uuid, sighting_description text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare created_id uuid;
declare alert_owner uuid;
declare coarse_location extensions.geography(point, 4326);
declare area_label text;
begin
  if not public.is_active_member() then raise exception 'active member access required'; end if;
  if char_length(trim(sighting_description)) not between 3 and 1000 then raise exception 'invalid sighting description'; end if;
  select creator_id into alert_owner from public.lost_found_alerts where id = target_alert and status = 'active' and resolved_at is null;
  if alert_owner is null or alert_owner = auth.uid() or public.has_block_between(auth.uid(), alert_owner) then raise exception 'alert unavailable'; end if;
  select approximate_location, neighborhood into coarse_location, area_label from public.profiles where id = auth.uid() and status = 'active';
  insert into public.alert_sightings (alert_id, reporter_id, description, approximate_location, neighborhood_label)
  values (target_alert, auth.uid(), trim(sighting_description), coarse_location, area_label)
  returning id into created_id;
  return created_id;
end;
$$;

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
declare selected_report public.reports%rowtype;
declare applied_action text := 'report_dismissed';
begin
  if not public.is_admin() then raise exception 'administrator access required'; end if;
  if decision not in ('resolved', 'dismissed') then raise exception 'invalid moderation decision'; end if;
  if char_length(trim(action_reason)) < 3 then raise exception 'moderation reason required'; end if;
  select * into selected_report from public.reports where id = target_report_id and status in ('open', 'reviewing') for update;
  if not found then raise exception 'open report not found'; end if;

  if decision = 'resolved' then
    applied_action := 'content_removed';
    case selected_report.target_type
      when 'post' then update public.posts set status = 'removed' where id = selected_report.target_id;
      when 'comment' then update public.comments set status = 'removed' where id = selected_report.target_id;
      when 'message' then update public.messages set status = 'removed' where id = selected_report.target_id;
      when 'activity' then update public.activities set status = 'removed' where id = selected_report.target_id;
      when 'alert' then update public.lost_found_alerts set status = 'removed', is_urgent = false where id = selected_report.target_id;
      when 'pet' then update public.pets set is_visible = false where id = selected_report.target_id;
      when 'profile' then
        applied_action := 'profile_suspended';
        update public.profiles set status = 'suspended' where id = selected_report.target_id and not is_admin;
      when 'breeding_profile' then
        applied_action := 'breeding_profile_rejected';
        update public.breeding_profiles set status = 'rejected', is_active = false where id = selected_report.target_id;
      else raise exception 'unsupported moderation target';
    end case;
  end if;

  update public.reports set status = decision, assigned_to = auth.uid(), resolved_at = now() where id = target_report_id;
  insert into public.moderation_actions (moderator_id, report_id, target_type, target_id, action, reason)
  values (auth.uid(), selected_report.id, selected_report.target_type, selected_report.target_id, applied_action, trim(action_reason));
  perform public.notify_recipient(selected_report.reporter_id, 'moderation', 'report', selected_report.id, jsonb_build_object('decision', decision));
end;
$$;

create or replace function public.notify_recipient(
  target_recipient uuid,
  notification_kind text,
  target_entity_type text,
  target_entity_id uuid,
  notification_payload jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_recipient is null or target_recipient = auth.uid() then return; end if;
  insert into public.notifications (recipient_id, actor_id, kind, entity_type, entity_id, payload)
  values (target_recipient, auth.uid(), notification_kind, target_entity_type, target_entity_id, coalesce(notification_payload, '{}'));
end;
$$;

create or replace function public.on_social_event_create_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare recipient uuid;
begin
  if tg_table_name = 'post_likes' then
    select author_id into recipient from public.posts where id = new.post_id;
    perform public.notify_recipient(recipient, 'like', 'post', new.post_id, '{}'::jsonb);
  elsif tg_table_name = 'comments' then
    select author_id into recipient from public.posts where id = new.post_id;
    perform public.notify_recipient(recipient, 'comment', 'post', new.post_id, jsonb_build_object('comment_id', new.id));
  elsif tg_table_name = 'connections' then
    if tg_op = 'INSERT' then
      perform public.notify_recipient(new.addressee_id, 'connection', 'profile', new.requester_id, '{}'::jsonb);
    elsif old.status = 'pending' and new.status in ('accepted', 'declined') then
      perform public.notify_recipient(new.requester_id, 'connection', 'profile', new.addressee_id, jsonb_build_object('decision', new.status));
    end if;
  elsif tg_table_name = 'messages' then
    for recipient in select profile_id from public.conversation_members where conversation_id = new.conversation_id and profile_id <> new.sender_id loop
      perform public.notify_recipient(recipient, 'message', 'conversation', new.conversation_id, jsonb_build_object('preview', left(coalesce(new.body, 'Photo'), 100)));
    end loop;
  elsif tg_table_name = 'alert_sightings' then
    select creator_id into recipient from public.lost_found_alerts where id = new.alert_id;
    perform public.notify_recipient(recipient, 'alert', 'alert', new.alert_id, jsonb_build_object('sighting_id', new.id));
  elsif tg_table_name = 'activity_attendance' then
    if tg_op = 'INSERT' then
      select host_id into recipient from public.activities where id = new.activity_id;
      perform public.notify_recipient(recipient, 'activity', 'activity', new.activity_id, jsonb_build_object('status', new.status));
    elsif old.status = 'pending' and new.status in ('approved', 'declined') then
      perform public.notify_recipient(new.profile_id, 'activity', 'activity', new.activity_id, jsonb_build_object('status', new.status));
    end if;
  elsif tg_table_name = 'lost_found_alerts' and new.kind = 'lost' and new.is_urgent then
    for recipient in
      select p.id from public.profiles p
      where p.id <> new.creator_id
        and p.status = 'active'
        and p.nearby_alerts_enabled
        and p.approximate_location is not null
        and not public.has_block_between(new.creator_id, p.id)
        and extensions.st_dwithin(p.approximate_location, new.approximate_location, 20000)
      limit 500
    loop
      perform public.notify_recipient(recipient, 'alert', 'alert', new.id, '{}'::jsonb);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists post_likes_notify on public.post_likes;
create trigger post_likes_notify after insert on public.post_likes for each row execute function public.on_social_event_create_notification();
drop trigger if exists comments_notify on public.comments;
create trigger comments_notify after insert on public.comments for each row execute function public.on_social_event_create_notification();
drop trigger if exists connections_notify on public.connections;
create trigger connections_notify after insert or update on public.connections for each row execute function public.on_social_event_create_notification();
drop trigger if exists messages_notify on public.messages;
create trigger messages_notify after insert on public.messages for each row execute function public.on_social_event_create_notification();
drop trigger if exists alert_sightings_notify on public.alert_sightings;
create trigger alert_sightings_notify after insert on public.alert_sightings for each row execute function public.on_social_event_create_notification();
drop trigger if exists activity_attendance_notify on public.activity_attendance;
create trigger activity_attendance_notify after insert or update on public.activity_attendance for each row execute function public.on_social_event_create_notification();
drop trigger if exists lost_found_alerts_notify on public.lost_found_alerts;
create trigger lost_found_alerts_notify after insert on public.lost_found_alerts for each row execute function public.on_social_event_create_notification();

create or replace function public.enforce_community_rate_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare recent_count integer;
begin
  if auth.uid() is null then return new; end if;
  if tg_table_name = 'posts' then
    select count(*) into recent_count from public.posts where author_id = auth.uid() and created_at > now() - interval '1 hour';
    if recent_count >= 10 then raise exception 'post rate limit exceeded'; end if;
  elsif tg_table_name = 'comments' then
    select count(*) into recent_count from public.comments where author_id = auth.uid() and created_at > now() - interval '1 hour';
    if recent_count >= 60 then raise exception 'comment rate limit exceeded'; end if;
  elsif tg_table_name = 'connections' then
    select count(*) into recent_count from public.connections where requester_id = auth.uid() and created_at > now() - interval '24 hours';
    if recent_count >= 40 then raise exception 'connection request rate limit exceeded'; end if;
  elsif tg_table_name = 'activities' then
    select count(*) into recent_count from public.activities where host_id = auth.uid() and created_at > now() - interval '24 hours';
    if recent_count >= 10 then raise exception 'activity rate limit exceeded'; end if;
  elsif tg_table_name = 'lost_found_alerts' then
    select count(*) into recent_count from public.lost_found_alerts where creator_id = auth.uid() and created_at > now() - interval '24 hours';
    if recent_count >= 10 then raise exception 'alert rate limit exceeded'; end if;
  elsif tg_table_name = 'alert_sightings' then
    select count(*) into recent_count from public.alert_sightings where reporter_id = auth.uid() and created_at > now() - interval '24 hours';
    if recent_count >= 20 then raise exception 'sighting rate limit exceeded'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists posts_rate_limit on public.posts;
create trigger posts_rate_limit before insert on public.posts for each row execute function public.enforce_community_rate_limits();
drop trigger if exists comments_rate_limit on public.comments;
create trigger comments_rate_limit before insert on public.comments for each row execute function public.enforce_community_rate_limits();
drop trigger if exists connections_rate_limit on public.connections;
create trigger connections_rate_limit before insert on public.connections for each row execute function public.enforce_community_rate_limits();
drop trigger if exists activities_rate_limit on public.activities;
create trigger activities_rate_limit before insert on public.activities for each row execute function public.enforce_community_rate_limits();
drop trigger if exists lost_found_alerts_rate_limit on public.lost_found_alerts;
create trigger lost_found_alerts_rate_limit before insert on public.lost_found_alerts for each row execute function public.enforce_community_rate_limits();
drop trigger if exists alert_sightings_rate_limit on public.alert_sightings;
create trigger alert_sightings_rate_limit before insert on public.alert_sightings for each row execute function public.enforce_community_rate_limits();

create or replace function public.on_block_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.connections
  where (requester_id = new.blocker_id and addressee_id = new.blocked_id)
     or (requester_id = new.blocked_id and addressee_id = new.blocker_id);
  return new;
end;
$$;

create or replace function public.enforce_owned_media_path()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare candidate_path text;
declare expected_owner uuid;
begin
  if tg_table_name = 'profiles' then candidate_path := new.avatar_path; expected_owner := new.id;
  elsif tg_table_name = 'lost_found_alerts' then candidate_path := new.photo_path; expected_owner := new.creator_id;
  elsif tg_table_name = 'messages' then candidate_path := new.media_path; expected_owner := new.sender_id;
  elsif tg_table_name = 'pet_photos' then
    candidate_path := new.storage_path;
    select owner_id into expected_owner from public.pets where id = new.pet_id;
  elsif tg_table_name = 'post_media' then
    candidate_path := new.storage_path;
    select author_id into expected_owner from public.posts where id = new.post_id;
  end if;
  if candidate_path is not null and split_part(candidate_path, '/', 1) <> expected_owner::text then
    raise exception 'media path owner mismatch';
  end if;
  return new;
end;
$$;

create or replace function public.protect_user_managed_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_admin() then return new; end if;
  if tg_table_name = 'pets' and auth.uid() = old.owner_id then
    new.verification_status := old.verification_status;
    new.vaccination_status := old.vaccination_status;
  elsif tg_table_name = 'posts' and auth.uid() = old.author_id then new.status := old.status;
  elsif tg_table_name = 'comments' and auth.uid() = old.author_id then new.status := old.status;
  elsif tg_table_name = 'lost_found_alerts' and auth.uid() = old.creator_id then new.status := old.status;
  elsif tg_table_name = 'messages' and auth.uid() = old.sender_id then new.status := old.status;
  elsif tg_table_name = 'activities' and auth.uid() = old.host_id then new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_media_path_owner on public.profiles;
create trigger profiles_media_path_owner before insert or update of avatar_path on public.profiles for each row execute function public.enforce_owned_media_path();
drop trigger if exists alerts_media_path_owner on public.lost_found_alerts;
create trigger alerts_media_path_owner before insert or update of photo_path on public.lost_found_alerts for each row execute function public.enforce_owned_media_path();
drop trigger if exists messages_media_path_owner on public.messages;
create trigger messages_media_path_owner before insert or update of media_path on public.messages for each row execute function public.enforce_owned_media_path();
drop trigger if exists pet_photos_media_path_owner on public.pet_photos;
create trigger pet_photos_media_path_owner before insert or update of storage_path on public.pet_photos for each row execute function public.enforce_owned_media_path();
drop trigger if exists post_media_path_owner on public.post_media;
create trigger post_media_path_owner before insert or update of storage_path on public.post_media for each row execute function public.enforce_owned_media_path();

drop trigger if exists pets_protect_review on public.pets;
create trigger pets_protect_review before update on public.pets for each row execute function public.protect_user_managed_fields();
drop trigger if exists posts_protect_status on public.posts;
create trigger posts_protect_status before update on public.posts for each row execute function public.protect_user_managed_fields();
drop trigger if exists comments_protect_status on public.comments;
create trigger comments_protect_status before update on public.comments for each row execute function public.protect_user_managed_fields();
drop trigger if exists alerts_protect_status on public.lost_found_alerts;
create trigger alerts_protect_status before update on public.lost_found_alerts for each row execute function public.protect_user_managed_fields();
drop trigger if exists messages_protect_status on public.messages;
create trigger messages_protect_status before update on public.messages for each row execute function public.protect_user_managed_fields();
drop trigger if exists activities_protect_status on public.activities;
create trigger activities_protect_status before update on public.activities for each row execute function public.protect_user_managed_fields();

drop trigger if exists blocks_remove_connection on public.blocks;
create trigger blocks_remove_connection after insert on public.blocks for each row execute function public.on_block_created();

drop policy if exists "participants update connection" on public.connections;
drop policy if exists "requester creates connection" on public.connections;
create policy "addressee responds to connection" on public.connections for update
  using (addressee_id = auth.uid() and status = 'pending')
  with check (addressee_id = auth.uid() and requester_id <> auth.uid() and status in ('accepted', 'declined'));
create policy "participants remove connection" on public.connections for delete
  using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "users or hosts update attendance" on public.activity_attendance;
drop policy if exists "users request attendance" on public.activity_attendance;
create policy "hosts update attendance" on public.activity_attendance for update
  using (exists(select 1 from public.activities a where a.id = activity_id and a.host_id = auth.uid()))
  with check (exists(select 1 from public.activities a where a.id = activity_id and a.host_id = auth.uid()));
create policy "attendees cancel attendance" on public.activity_attendance for delete using (profile_id = auth.uid());

drop policy if exists "authenticated create conversations" on public.conversations;
drop policy if exists "eligible members join conversations" on public.conversation_members;
drop policy if exists "members read conversations" on public.conversations;
create policy "eligible members read conversations" on public.conversations for select using (public.can_access_conversation(id));
drop policy if exists "members read membership" on public.conversation_members;
create policy "eligible members read membership" on public.conversation_members for select using (public.can_access_conversation(conversation_id));
drop policy if exists "members read messages" on public.messages;
create policy "eligible members read messages" on public.messages for select using (public.can_access_conversation(conversation_id));
drop policy if exists "members send messages" on public.messages;
create policy "eligible members send messages" on public.messages for insert
  with check (sender_id = auth.uid() and public.is_active_member() and public.can_access_conversation(conversation_id));

create policy "participants read direct conversation mapping" on public.direct_conversations for select
  using (first_profile_id = auth.uid() or second_profile_id = auth.uid());

create policy "alert owner reads sightings" on public.alert_sightings for select using (
  reporter_id = auth.uid()
  or exists(select 1 from public.lost_found_alerts a where a.id = alert_id and a.creator_id = auth.uid())
  or public.is_admin()
);

revoke all on public.alert_sightings from anon;
revoke select, insert, update, delete on public.alert_sightings from authenticated;
grant select (id, alert_id, reporter_id, description, neighborhood_label, created_at) on public.alert_sightings to authenticated;

drop policy if exists "visible pets readable" on public.pets;
create policy "visible unblocked pets readable" on public.pets for select using (
  owner_id = auth.uid() or public.is_admin() or (
    is_visible
    and not public.has_block_between(auth.uid(), owner_id)
    and exists(select 1 from public.profiles p where p.id = owner_id and p.status = 'active' and p.is_discoverable)
  )
);

drop policy if exists "owners manage pets" on public.pets;
create policy "active owners manage pets" on public.pets for all
  using ((owner_id = auth.uid() and public.is_active_member()) or public.is_admin())
  with check ((owner_id = auth.uid() and public.is_active_member()) or public.is_admin());

drop policy if exists "owners manage pet photos" on public.pet_photos;
create policy "owners manage owned pet photos" on public.pet_photos for all
  using (exists(select 1 from public.pets p where p.id = pet_id and p.owner_id = auth.uid()))
  with check (
    split_part(storage_path, '/', 1) = auth.uid()::text
    and exists(select 1 from public.pets p where p.id = pet_id and p.owner_id = auth.uid())
  );

drop policy if exists "authors manage post media" on public.post_media;
create policy "authors manage owned post media" on public.post_media for all
  using (exists(select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()))
  with check (
    split_part(storage_path, '/', 1) = auth.uid()::text
    and exists(select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
  );

drop policy if exists "active activities readable" on public.activities;
create policy "active unblocked activities readable" on public.activities for select using (
  host_id = auth.uid() or public.is_admin() or (status = 'active' and not public.has_block_between(auth.uid(), host_id))
);

drop policy if exists "active alerts readable" on public.lost_found_alerts;
create policy "active unblocked alerts readable" on public.lost_found_alerts for select using (
  creator_id = auth.uid() or public.is_admin() or (status = 'active' and not public.has_block_between(auth.uid(), creator_id))
);

drop policy if exists "active comments readable" on public.comments;
create policy "active unblocked comments readable" on public.comments for select using (
  author_id = auth.uid() or public.is_admin() or (
    status = 'active' and not public.has_block_between(auth.uid(), author_id)
    and exists(select 1 from public.posts p where p.id = post_id and p.status = 'active')
  )
);

drop policy if exists "active profiles are discoverable" on public.profiles;
create policy "active profiles are safely readable" on public.profiles for select using (
  id = auth.uid() or public.is_admin() or (
    status = 'active' and (
      is_discoverable
      or exists(select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = id)
      or exists(select 1 from public.connections c where (c.requester_id = auth.uid() and c.addressee_id = id) or (c.requester_id = id and c.addressee_id = auth.uid()))
    )
  )
);

drop policy if exists "users manage own likes" on public.post_likes;
create policy "users manage own allowed likes" on public.post_likes for all
  using (profile_id = auth.uid())
  with check (
    profile_id = auth.uid() and public.is_active_member()
    and exists (
      select 1 from public.posts p
      where p.id = post_id and p.status = 'active' and not public.has_block_between(auth.uid(), p.author_id)
    )
  );

drop policy if exists "users create comments" on public.comments;
create policy "users create allowed comments" on public.comments for insert with check (
  author_id = auth.uid() and public.is_active_member()
  and exists (
    select 1 from public.posts p
    where p.id = post_id and p.status = 'active' and not public.has_block_between(auth.uid(), p.author_id)
  )
);

drop policy if exists "authors create posts" on public.posts;
create policy "active authors create posts" on public.posts for insert with check (author_id = auth.uid() and public.is_active_member());

drop policy if exists "hosts create activities" on public.activities;
drop policy if exists "users create alerts" on public.lost_found_alerts;
drop policy if exists "hosts manage activities" on public.activities;
drop policy if exists "creators manage alerts" on public.lost_found_alerts;

drop policy if exists "users update own profile" on public.profiles;
create policy "active users update own profile" on public.profiles for update
  using (id = auth.uid() and status = 'active')
  with check (id = auth.uid() and status = 'active' and is_admin = false);

drop policy if exists "users submit reports" on public.reports;
create policy "active users submit reports" on public.reports for insert
  with check (reporter_id = auth.uid() and status = 'open' and public.is_active_member());

-- Public clients receive privacy-safe columns only. Raw coarse points stay server-side for distance calculations.
revoke select on public.profiles from anon, authenticated;
grant select (
  id, display_name, handle, avatar_path, bio, neighborhood, city, country_code,
  interests, is_discoverable, allow_messages, verification_status, is_adult,
  status, created_at, updated_at, onboarded_at, nearby_alerts_enabled
) on public.profiles to authenticated;

revoke insert, update on public.profiles from authenticated;
grant update (
  display_name, handle, avatar_path, bio, neighborhood, city, country_code,
  interests, is_discoverable, allow_messages, nearby_alerts_enabled, updated_at
) on public.profiles to authenticated;

revoke insert, update on public.pets from authenticated;
grant insert (
  owner_id, name, species, breed, is_mixed_breed, sex, birth_date,
  approximate_age_months, size, temperament, energy_level, play_preferences,
  compatibility_notes, is_neutered_or_spayed, health_notes_public,
  vaccinations_current_self_reported, is_visible
) on public.pets to authenticated;
grant update (
  name, species, breed, is_mixed_breed, sex, birth_date, approximate_age_months,
  size, temperament, energy_level, play_preferences, compatibility_notes,
  is_neutered_or_spayed, health_notes_public, vaccinations_current_self_reported,
  is_visible, updated_at
) on public.pets to authenticated;

revoke select on public.activities from anon, authenticated;
grant select (
  id, host_id, type, title, description, starts_at, ends_at, capacity,
  neighborhood_label, compatible_species, compatible_sizes, status, created_at, updated_at
) on public.activities to authenticated;

revoke select on public.lost_found_alerts from anon, authenticated;
grant select (
  id, creator_id, pet_id, kind, title, description, photo_path, last_seen_at,
  neighborhood_label, is_urgent, resolved_at, status, created_at, updated_at
) on public.lost_found_alerts to authenticated;

revoke insert, update, delete on public.activities from authenticated;
revoke insert, update, delete on public.lost_found_alerts from authenticated;
revoke insert, update on public.connections from authenticated;
revoke insert, update on public.activity_attendance from authenticated;
revoke update on public.posts, public.comments, public.messages from authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('pet-photos', 'pet-photos', true, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('post-media', 'post-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('alert-media', 'alert-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('message-media', 'message-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('verification-documents', 'verification-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "owners upload avatars" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and public.is_active_member() and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners update avatars" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and owner_id = auth.uid()::text)
  with check (bucket_id = 'avatars' and owner_id = auth.uid()::text);
create policy "owners delete avatars" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and owner_id = auth.uid()::text);

create policy "owners upload pet photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'pet-photos' and public.is_active_member() and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners update pet photos" on storage.objects for update to authenticated
  using (bucket_id = 'pet-photos' and owner_id = auth.uid()::text)
  with check (bucket_id = 'pet-photos' and owner_id = auth.uid()::text);
create policy "owners delete pet photos" on storage.objects for delete to authenticated
  using (bucket_id = 'pet-photos' and owner_id = auth.uid()::text);

create policy "authenticated read allowed post media" on storage.objects for select to authenticated
  using (bucket_id = 'post-media' and exists (
    select 1 from public.post_media pm join public.posts p on p.id = pm.post_id
    where pm.storage_path = name and p.status = 'active' and not public.has_block_between(auth.uid(), p.author_id)
  ));
create policy "owners upload private community media" on storage.objects for insert to authenticated
  with check (bucket_id in ('post-media', 'alert-media', 'message-media') and public.is_active_member() and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners delete private community media" on storage.objects for delete to authenticated
  using (bucket_id in ('post-media', 'alert-media', 'message-media') and owner_id = auth.uid()::text);
create policy "authenticated read allowed alert media" on storage.objects for select to authenticated
  using (bucket_id = 'alert-media' and exists (
    select 1 from public.lost_found_alerts a
    where a.photo_path = name and a.status = 'active' and not public.has_block_between(auth.uid(), a.creator_id)
  ));
create policy "members read allowed message media" on storage.objects for select to authenticated
  using (bucket_id = 'message-media' and exists (
    select 1 from public.messages m
    where m.media_path = name and m.status = 'active' and public.can_access_conversation(m.conversation_id)
  ));

create policy "owners upload verification documents" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-documents' and public.is_active_member() and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners or admins read verification objects" on storage.objects for select to authenticated
  using (bucket_id = 'verification-documents' and (owner_id = auth.uid()::text or public.is_admin()));
create policy "owners delete pending verification objects" on storage.objects for delete to authenticated
  using (bucket_id = 'verification-documents' and owner_id = auth.uid()::text);

revoke execute on function public.complete_onboarding(uuid, text, text, text[], boolean, text, text, text, text, text, double precision, double precision, text, public.pet_species) from public, anon;
revoke execute on function public.is_active_member() from public, anon;
revoke execute on function public.set_my_location(double precision, double precision, text, text, text) from public, anon;
revoke execute on function public.clear_my_location() from public, anon;
revoke execute on function public.register_device_token(text, text) from public, anon;
revoke execute on function public.disable_my_device_token(text) from public, anon;
revoke execute on function public.nearby_profiles_for_me(integer, integer) from public, anon;
revoke execute on function public.request_connection(uuid) from public, anon;
revoke execute on function public.respond_to_connection(uuid, text) from public, anon;
revoke execute on function public.request_activity_attendance(uuid, uuid) from public, anon;
revoke execute on function public.respond_to_activity_attendance(uuid, uuid, public.attendance_status) from public, anon;
revoke execute on function public.ensure_direct_conversation(uuid) from public, anon;
revoke execute on function public.create_activity_for_me(public.activity_type, text, text, timestamptz, integer, text, text) from public, anon;
revoke execute on function public.create_lost_found_alert_for_me(public.alert_kind, text, text, text, timestamptz, boolean, uuid) from public, anon;
revoke execute on function public.report_alert_sighting(uuid, text) from public, anon;
revoke execute on function public.attach_my_alert_photo(uuid, text) from public, anon;
revoke execute on function public.resolve_my_alert(uuid) from public, anon;
revoke execute on function public.delete_my_alert(uuid) from public, anon;
revoke execute on function public.cancel_my_activity(uuid) from public, anon;
revoke execute on function public.notify_recipient(uuid, text, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.on_social_event_create_notification() from public, anon, authenticated;
revoke execute on function public.on_block_created() from public, anon, authenticated;
revoke execute on function public.enforce_community_rate_limits() from public, anon, authenticated;
revoke execute on function public.enforce_owned_media_path() from public, anon, authenticated;
revoke execute on function public.protect_user_managed_fields() from public, anon, authenticated;

grant execute on function public.has_block_between(uuid, uuid) to authenticated;
grant execute on function public.is_active_member() to authenticated;
grant execute on function public.can_access_conversation(uuid) to authenticated;
grant execute on function public.complete_onboarding(uuid, text, text, text[], boolean, text, text, text, text, text, double precision, double precision, text, public.pet_species) to authenticated;
grant execute on function public.set_my_location(double precision, double precision, text, text, text) to authenticated;
grant execute on function public.clear_my_location() to authenticated;
grant execute on function public.register_device_token(text, text) to authenticated;
grant execute on function public.disable_my_device_token(text) to authenticated;
grant execute on function public.nearby_profiles_for_me(integer, integer) to authenticated;
grant execute on function public.request_connection(uuid) to authenticated;
grant execute on function public.respond_to_connection(uuid, text) to authenticated;
grant execute on function public.request_activity_attendance(uuid, uuid) to authenticated;
grant execute on function public.respond_to_activity_attendance(uuid, uuid, public.attendance_status) to authenticated;
grant execute on function public.ensure_direct_conversation(uuid) to authenticated;
grant execute on function public.create_activity_for_me(public.activity_type, text, text, timestamptz, integer, text, text) to authenticated;
grant execute on function public.create_lost_found_alert_for_me(public.alert_kind, text, text, text, timestamptz, boolean, uuid) to authenticated;
grant execute on function public.report_alert_sighting(uuid, text) to authenticated;
grant execute on function public.attach_my_alert_photo(uuid, text) to authenticated;
grant execute on function public.resolve_my_alert(uuid) to authenticated;
grant execute on function public.delete_my_alert(uuid) to authenticated;
grant execute on function public.cancel_my_activity(uuid) to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'connections') then
    alter publication supabase_realtime add table public.connections;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'activity_attendance') then
    alter publication supabase_realtime add table public.activity_attendance;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pets') then alter publication supabase_realtime add table public.pets; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts') then alter publication supabase_realtime add table public.posts; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'post_likes') then alter publication supabase_realtime add table public.post_likes; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comments') then alter publication supabase_realtime add table public.comments; end if;
end
$$;

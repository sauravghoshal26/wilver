-- Wilver milestone-one schema. Run with `supabase db reset` locally.
create schema if not exists extensions;
create extension if not exists pgcrypto;
create extension if not exists postgis with schema extensions;

create type public.account_status as enum ('active', 'suspended', 'banned', 'deleted');
create type public.pet_species as enum ('dog', 'cat');
create type public.pet_sex as enum ('female', 'male', 'unknown');
create type public.pet_size as enum ('tiny', 'small', 'medium', 'large', 'giant');
create type public.content_status as enum ('active', 'under_review', 'removed');
create type public.activity_type as enum ('walk', 'playdate', 'event');
create type public.attendance_status as enum ('pending', 'approved', 'declined', 'cancelled');
create type public.alert_kind as enum ('lost', 'found');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type public.verification_status as enum ('unverified', 'pending', 'verified', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  handle text not null unique check (handle ~ '^[a-z0-9_.]{3,30}$'),
  avatar_path text,
  bio text check (char_length(bio) <= 280),
  neighborhood text,
  city text,
  country_code char(2),
  approximate_location extensions.geography(point, 4326),
  interests text[] not null default '{}',
  is_discoverable boolean not null default true,
  allow_messages text not null default 'connections' check (allow_messages in ('nobody', 'connections', 'everyone')),
  verification_status public.verification_status not null default 'unverified',
  is_adult boolean not null default false,
  is_admin boolean not null default false,
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Exact coordinates are isolated from public profile reads.
create table public.private_locations (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  exact_location extensions.geography(point, 4326) not null,
  updated_at timestamptz not null default now()
);

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  species public.pet_species not null,
  breed text,
  is_mixed_breed boolean not null default false,
  sex public.pet_sex not null default 'unknown',
  birth_date date,
  approximate_age_months integer check (approximate_age_months between 0 and 480),
  size public.pet_size,
  temperament text[] not null default '{}',
  energy_level smallint check (energy_level between 1 and 5),
  play_preferences text[] not null default '{}',
  compatibility_notes text check (char_length(compatibility_notes) <= 500),
  vaccination_status public.verification_status not null default 'unverified',
  is_neutered_or_spayed boolean,
  health_notes_public text check (char_length(health_notes_public) <= 500),
  breeding_opt_in boolean not null default false,
  verification_status public.verification_status not null default 'unverified',
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pet_private_health (
  pet_id uuid primary key references public.pets(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  health_notes_private text,
  veterinarian_contact text,
  updated_at timestamptz not null default now()
);

create table public.pet_photos (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  neighborhood_label text,
  status public.content_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  storage_path text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  alt_text text,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  status public.content_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.connections (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  type public.activity_type not null,
  title text not null check (char_length(title) between 3 and 100),
  description text check (char_length(description) <= 2000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  capacity integer check (capacity between 2 and 500),
  neighborhood_label text not null,
  approximate_location extensions.geography(point, 4326),
  compatible_species public.pet_species[],
  compatible_sizes public.pet_size[],
  status public.content_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

-- Exact meeting details are released only to approved attendees by RLS.
create table public.activity_private_locations (
  activity_id uuid primary key references public.activities(id) on delete cascade,
  exact_location extensions.geography(point, 4326),
  location_instructions text,
  updated_at timestamptz not null default now()
);

create table public.activity_attendance (
  activity_id uuid not null references public.activities(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  status public.attendance_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (activity_id, profile_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text check (char_length(body) between 1 and 4000),
  media_path text,
  status public.content_status not null default 'active',
  created_at timestamptz not null default now(),
  check (body is not null or media_path is not null)
);

create table public.lost_found_alerts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  kind public.alert_kind not null,
  title text not null,
  description text not null,
  photo_path text,
  last_seen_at timestamptz,
  approximate_location extensions.geography(point, 4326) not null,
  neighborhood_label text not null,
  is_urgent boolean not null default true,
  resolved_at timestamptz,
  status public.content_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.breeding_profiles (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null unique references public.pets(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  region_code text not null,
  health_summary text not null,
  genetic_tests text[] not null default '{}',
  responsible_breeding_acknowledged_at timestamptz not null,
  status public.verification_status not null default 'pending',
  is_active boolean not null default false,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete cascade,
  breeding_profile_id uuid references public.breeding_profiles(id) on delete cascade,
  document_type text not null,
  private_storage_path text not null,
  status public.verification_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null,
  entity_type text,
  entity_id uuid,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('profile', 'pet', 'post', 'comment', 'message', 'activity', 'alert', 'breeding_profile')),
  target_id uuid not null,
  reason text not null,
  details text check (char_length(details) <= 2000),
  evidence_paths text[] not null default '{}',
  status public.report_status not null default 'open',
  assigned_to uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references public.profiles(id),
  report_id uuid references public.reports(id) on delete set null,
  target_type text not null,
  target_id uuid not null,
  action text not null,
  reason text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  allowed_regions text[] not null default '{}',
  description text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android', 'web')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_location_gix on public.profiles using gist (approximate_location);
create index activities_location_gix on public.activities using gist (approximate_location);
create index alerts_location_gix on public.lost_found_alerts using gist (approximate_location);
create index posts_created_idx on public.posts (created_at desc) where status = 'active';
create index comments_post_idx on public.comments (post_id, created_at);
create index activities_starts_idx on public.activities (starts_at) where status = 'active';
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index reports_status_idx on public.reports (status, created_at);

create or replace function public.set_updated_at() returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.protect_profile_security_fields() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() = old.id and not public.is_admin() then
    new.is_admin := old.is_admin;
    new.status := old.status;
    new.verification_status := old.verification_status;
  end if;
  return new;
end;
$$;

create or replace function public.protect_breeding_review_fields() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() = old.owner_id and not public.is_admin() then
    new.status := old.status;
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
    if old.status <> 'verified' then new.is_active := false; end if;
  end if;
  return new;
end;
$$;

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger profiles_security before update on public.profiles for each row execute function public.protect_profile_security_fields();
create trigger pets_updated before update on public.pets for each row execute function public.set_updated_at();
create trigger posts_updated before update on public.posts for each row execute function public.set_updated_at();
create trigger activities_updated before update on public.activities for each row execute function public.set_updated_at();
create trigger conversations_updated before update on public.conversations for each row execute function public.set_updated_at();
create trigger alerts_updated before update on public.lost_found_alerts for each row execute function public.set_updated_at();
create trigger breeding_updated before update on public.breeding_profiles for each row execute function public.set_updated_at();
create trigger breeding_security before update on public.breeding_profiles for each row execute function public.protect_breeding_review_fields();

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid() and status = 'active'), false)
$$;

create or replace function public.is_conversation_member(conversation uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.conversation_members where conversation_id = conversation and profile_id = auth.uid())
$$;

create or replace function public.nearby_profiles(lat double precision, lng double precision, radius_meters integer default 10000)
returns table (id uuid, display_name text, handle text, neighborhood text, distance_meters double precision)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.display_name, p.handle, p.neighborhood,
    extensions.st_distance(p.approximate_location, extensions.st_point(lng, lat)::extensions.geography) as distance_meters
  from public.profiles p
  where p.is_discoverable and p.status = 'active'
    and p.id <> auth.uid()
    and extensions.st_dwithin(p.approximate_location, extensions.st_point(lng, lat)::extensions.geography, radius_meters)
    and not exists (select 1 from public.blocks b where (b.blocker_id = auth.uid() and b.blocked_id = p.id) or (b.blocker_id = p.id and b.blocked_id = auth.uid()))
  order by distance_meters;
$$;

insert into public.feature_flags (key, enabled, description) values
  ('breeding', false, 'Responsible-breeding discovery; requires adult, region and verification gates'),
  ('push_notifications', false, 'Remote push delivery; in-app notifications remain enabled'),
  ('lost_pet_nearby_alerts', true, 'Privacy-safe nearby lost/found alert discovery');

alter table public.profiles enable row level security;
alter table public.private_locations enable row level security;
alter table public.pets enable row level security;
alter table public.pet_private_health enable row level security;
alter table public.pet_photos enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.connections enable row level security;
alter table public.blocks enable row level security;
alter table public.activities enable row level security;
alter table public.activity_private_locations enable row level security;
alter table public.activity_attendance enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.lost_found_alerts enable row level security;
alter table public.breeding_profiles enable row level security;
alter table public.verification_documents enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.feature_flags enable row level security;
alter table public.device_tokens enable row level security;

create policy "active profiles are discoverable" on public.profiles for select using ((is_discoverable and status = 'active') or id = auth.uid() or public.is_admin());
create policy "users create own profile" on public.profiles for insert with check (id = auth.uid());
create policy "users update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and is_admin = false);
create policy "users manage own exact location" on public.private_locations for all using (profile_id = auth.uid() or public.is_admin()) with check (profile_id = auth.uid() or public.is_admin());

create policy "visible pets readable" on public.pets for select using ((is_visible and exists(select 1 from public.profiles p where p.id = owner_id and p.status = 'active')) or owner_id = auth.uid() or public.is_admin());
create policy "owners manage pets" on public.pets for all using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy "owners manage private pet health" on public.pet_private_health for all using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy "pet photos follow pet visibility" on public.pet_photos for select using (exists(select 1 from public.pets p where p.id = pet_id and (p.is_visible or p.owner_id = auth.uid())));
create policy "owners manage pet photos" on public.pet_photos for all using (exists(select 1 from public.pets p where p.id = pet_id and p.owner_id = auth.uid())) with check (exists(select 1 from public.pets p where p.id = pet_id and p.owner_id = auth.uid()));

create policy "active posts readable" on public.posts for select using ((status = 'active' and not exists(select 1 from public.blocks b where (b.blocker_id = auth.uid() and b.blocked_id = author_id) or (b.blocker_id = author_id and b.blocked_id = auth.uid()))) or author_id = auth.uid() or public.is_admin());
create policy "authors create posts" on public.posts for insert with check (author_id = auth.uid());
create policy "authors manage posts" on public.posts for update using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());
create policy "authors delete posts" on public.posts for delete using (author_id = auth.uid() or public.is_admin());
create policy "post media readable" on public.post_media for select using (exists(select 1 from public.posts p where p.id = post_id and p.status = 'active'));
create policy "authors manage post media" on public.post_media for all using (exists(select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())) with check (exists(select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));
create policy "likes readable" on public.post_likes for select using (true);
create policy "users manage own likes" on public.post_likes for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "active comments readable" on public.comments for select using (status = 'active' or author_id = auth.uid() or public.is_admin());
create policy "users create comments" on public.comments for insert with check (author_id = auth.uid());
create policy "authors manage comments" on public.comments for update using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());

create policy "connection participants read" on public.connections for select using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "requester creates connection" on public.connections for insert with check (requester_id = auth.uid());
create policy "participants update connection" on public.connections for update using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "users read relevant blocks" on public.blocks for select using (blocker_id = auth.uid() or blocked_id = auth.uid() or public.is_admin());
create policy "users manage own blocks" on public.blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create policy "active activities readable" on public.activities for select using (status = 'active' or host_id = auth.uid() or public.is_admin());
create policy "hosts create activities" on public.activities for insert with check (host_id = auth.uid());
create policy "hosts manage activities" on public.activities for update using (host_id = auth.uid() or public.is_admin()) with check (host_id = auth.uid() or public.is_admin());
create policy "approved attendees read meeting point" on public.activity_private_locations for select using (
  exists(select 1 from public.activities a where a.id = activity_id and a.host_id = auth.uid())
  or exists(select 1 from public.activity_attendance aa where aa.activity_id = activity_id and aa.profile_id = auth.uid() and aa.status = 'approved')
  or public.is_admin()
);
create policy "hosts manage meeting point" on public.activity_private_locations for all using (
  exists(select 1 from public.activities a where a.id = activity_id and a.host_id = auth.uid()) or public.is_admin()
) with check (
  exists(select 1 from public.activities a where a.id = activity_id and a.host_id = auth.uid()) or public.is_admin()
);
create policy "attendance participants read" on public.activity_attendance for select using (profile_id = auth.uid() or exists(select 1 from public.activities a where a.id = activity_id and a.host_id = auth.uid()) or public.is_admin());
create policy "users request attendance" on public.activity_attendance for insert with check (profile_id = auth.uid());
create policy "users or hosts update attendance" on public.activity_attendance for update using (profile_id = auth.uid() or exists(select 1 from public.activities a where a.id = activity_id and a.host_id = auth.uid()));

create policy "members read conversations" on public.conversations for select using (public.is_conversation_member(id));
create policy "authenticated create conversations" on public.conversations for insert to authenticated with check (true);
create policy "members read membership" on public.conversation_members for select using (public.is_conversation_member(conversation_id));
create policy "members join conversations" on public.conversation_members for insert with check (profile_id = auth.uid() or public.is_conversation_member(conversation_id));
create policy "members update own read state" on public.conversation_members for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "members read messages" on public.messages for select using (public.is_conversation_member(conversation_id));
create policy "members send messages" on public.messages for insert with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id));
create policy "senders moderate own messages" on public.messages for update using (sender_id = auth.uid() or public.is_admin());

create policy "active alerts readable" on public.lost_found_alerts for select using (status = 'active' or creator_id = auth.uid() or public.is_admin());
create policy "users create alerts" on public.lost_found_alerts for insert with check (creator_id = auth.uid());
create policy "creators manage alerts" on public.lost_found_alerts for update using (creator_id = auth.uid() or public.is_admin()) with check (creator_id = auth.uid() or public.is_admin());

-- Breeding records are only visible to their owner/admin unless enabled, verified and region-gated.
create policy "gated breeding profiles readable" on public.breeding_profiles for select using (
  owner_id = auth.uid() or public.is_admin() or (
    is_active and status = 'verified'
    and exists(select 1 from public.feature_flags f where f.key = 'breeding' and f.enabled and (cardinality(f.allowed_regions) = 0 or region_code = any(f.allowed_regions)))
    and exists(select 1 from public.profiles p where p.id = auth.uid() and p.is_adult and p.status = 'active')
  )
);
create policy "owners create breeding profile" on public.breeding_profiles for insert with check (owner_id = auth.uid() and is_active = false and status = 'pending');
create policy "owners or admins update breeding profile" on public.breeding_profiles for update using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy "documents owner or admin read" on public.verification_documents for select using (owner_id = auth.uid() or public.is_admin());
create policy "owners submit documents" on public.verification_documents for insert with check (owner_id = auth.uid() and status = 'pending');
create policy "admins review documents" on public.verification_documents for update using (public.is_admin()) with check (public.is_admin());

create policy "recipients read notifications" on public.notifications for select using (recipient_id = auth.uid());
create policy "recipients update notifications" on public.notifications for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "users submit reports" on public.reports for insert with check (reporter_id = auth.uid() and status = 'open');
create policy "reporters or admins read reports" on public.reports for select using (reporter_id = auth.uid() or public.is_admin());
create policy "admins manage reports" on public.reports for update using (public.is_admin()) with check (public.is_admin());
create policy "admins read moderation actions" on public.moderation_actions for select using (public.is_admin());
create policy "admins create moderation actions" on public.moderation_actions for insert with check (public.is_admin() and moderator_id = auth.uid());
create policy "flags readable" on public.feature_flags for select to authenticated using (true);
create policy "admins manage flags" on public.feature_flags for all using (public.is_admin()) with check (public.is_admin());
create policy "users manage device tokens" on public.device_tokens for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

grant execute on function public.nearby_profiles(double precision, double precision, integer) to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Explicit Data API privileges for projects created with automatic table exposure disabled.
-- RLS remains enabled on every table and is still required for every permitted operation.

grant usage on schema public to authenticated;

-- Privacy-safe community reads. Sensitive profile coordinates, private health data,
-- verification documents, device tokens, and moderation audit data are intentionally absent.
grant select (
  id, owner_id, name, species, breed, sex, birth_date, approximate_age_months,
  size, temperament, energy_level, vaccination_status,
  vaccinations_current_self_reported, is_neutered_or_spayed,
  verification_status, is_visible, created_at
) on public.pets to authenticated;

grant select (id, pet_id, storage_path, position) on public.pet_photos to authenticated;
grant select (id, author_id, pet_id, body, neighborhood_label, status, created_at) on public.posts to authenticated;
grant select (id, post_id, storage_path, position) on public.post_media to authenticated;
grant select (post_id, profile_id, created_at) on public.post_likes to authenticated;
grant select (id, post_id, author_id, body, status, created_at) on public.comments to authenticated;
grant select (requester_id, addressee_id, status, created_at) on public.connections to authenticated;
grant select (blocker_id, blocked_id, created_at) on public.blocks to authenticated;
grant select (activity_id, location_instructions) on public.activity_private_locations to authenticated;
grant select (activity_id, profile_id, pet_id, status, created_at) on public.activity_attendance to authenticated;
grant select (conversation_id, profile_id, last_read_at) on public.conversation_members to authenticated;
grant select (id, conversation_id, sender_id, body, media_path, status, created_at) on public.messages to authenticated;
grant select (id, kind, entity_type, entity_id, payload, read_at, created_at, actor_id) on public.notifications to authenticated;
grant select (key, enabled) on public.feature_flags to authenticated;
grant select (owner_id, status, responsible_breeding_acknowledged_at) on public.breeding_profiles to authenticated;
grant select (id, target_type, target_id, reason, details, status, created_at) on public.reports to authenticated;

-- Client mutations used by the application. Column grants constrain payload shape;
-- RLS constrains which rows the signed-in member may affect.
grant insert (author_id, pet_id, body) on public.posts to authenticated;
grant delete on public.posts to authenticated;
grant insert (post_id, storage_path, media_type, position) on public.post_media to authenticated;
grant insert (post_id, profile_id) on public.post_likes to authenticated;
grant delete on public.post_likes to authenticated;
grant insert (post_id, author_id, body) on public.comments to authenticated;

grant delete on public.pets to authenticated;
grant insert (pet_id, storage_path, alt_text, position) on public.pet_photos to authenticated;
grant delete on public.pet_photos to authenticated;

grant delete on public.activity_attendance to authenticated;
grant update (last_read_at) on public.conversation_members to authenticated;
grant insert (conversation_id, sender_id, body, media_path, client_nonce) on public.messages to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant insert (reporter_id, target_type, target_id, reason, details) on public.reports to authenticated;
grant insert (blocker_id, blocked_id) on public.blocks to authenticated;
grant delete on public.blocks to authenticated;
grant delete on public.connections to authenticated;
grant update (enabled, updated_at) on public.feature_flags to authenticated;

-- No anonymous table access is needed by the mobile client.
revoke all on public.pets, public.pet_photos, public.posts, public.post_media,
  public.post_likes, public.comments, public.connections, public.blocks,
  public.activity_private_locations, public.activity_attendance,
  public.conversation_members, public.messages, public.notifications,
  public.feature_flags, public.breeding_profiles, public.reports from anon;

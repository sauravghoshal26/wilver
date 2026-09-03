-- Fictional local fixtures. Password for all local fixture accounts: wilver-local
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'maya@local.wilver.app', crypt('wilver-local', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'arjun@local.wilver.app', crypt('wilver-local', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zoya@local.wilver.app', crypt('wilver-local', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'neil@local.wilver.app', crypt('wilver-local', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tara@local.wilver.app', crypt('wilver-local', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rhea.admin@local.wilver.app', crypt('wilver-local', gen_salt('bf')), now(), now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, display_name, handle, neighborhood, city, country_code, approximate_location, interests, is_adult, verification_status, onboarded_at, terms_accepted_at, terms_version, privacy_accepted_at, privacy_version)
values
  ('00000000-0000-0000-0000-000000000001', 'Maya Rao', 'mayaandmilo', 'Indiranagar', 'Bengaluru', 'IN', extensions.st_point(77.6408, 12.9784)::extensions.geography, array['walks','playdates'], true, 'verified', now(), now(), 'local-dev', now(), 'local-dev'),
  ('00000000-0000-0000-0000-000000000002', 'Arjun Mehta', 'arjunpaws', 'Koramangala', 'Bengaluru', 'IN', extensions.st_point(77.6271, 12.9352)::extensions.geography, array['rescue','training'], true, 'verified', now(), now(), 'local-dev', now(), 'local-dev'),
  ('00000000-0000-0000-0000-000000000003', 'Zoya Khan', 'zoyaandchai', 'Domlur', 'Bengaluru', 'IN', extensions.st_point(77.6387, 12.9610)::extensions.geography, array['cats','pet-friendly places'], true, 'unverified', now(), now(), 'local-dev', now(), 'local-dev'),
  ('00000000-0000-0000-0000-000000000004', 'Neil Dsouza', 'neilandbean', 'Ulsoor', 'Bengaluru', 'IN', extensions.st_point(77.6269, 12.9817)::extensions.geography, array['walks','events'], true, 'verified', now(), now(), 'local-dev', now(), 'local-dev'),
  ('00000000-0000-0000-0000-000000000005', 'Tara Sen', 'taratails', 'HSR Layout', 'Bengaluru', 'IN', extensions.st_point(77.6382, 12.9116)::extensions.geography, array['cats','community'], true, 'unverified', now(), now(), 'local-dev', now(), 'local-dev'),
  ('00000000-0000-0000-0000-000000000006', 'Rhea Menon', 'rhea.trust', 'Bengaluru', 'Bengaluru', 'IN', null, array['moderation'], true, 'verified', now(), now(), 'local-dev', now(), 'local-dev')
on conflict (id) do update set display_name = excluded.display_name;

update public.profiles set is_admin = true, is_discoverable = false, allow_messages = 'nobody'
where id = '00000000-0000-0000-0000-000000000006';

insert into public.private_locations (profile_id, exact_location) values
  ('00000000-0000-0000-0000-000000000001', extensions.st_point(77.6408, 12.9784)::extensions.geography),
  ('00000000-0000-0000-0000-000000000002', extensions.st_point(77.6271, 12.9352)::extensions.geography),
  ('00000000-0000-0000-0000-000000000003', extensions.st_point(77.6387, 12.9610)::extensions.geography),
  ('00000000-0000-0000-0000-000000000004', extensions.st_point(77.6269, 12.9817)::extensions.geography),
  ('00000000-0000-0000-0000-000000000005', extensions.st_point(77.6382, 12.9116)::extensions.geography)
on conflict (profile_id) do update set exact_location = excluded.exact_location;

insert into public.pets (id, owner_id, name, species, breed, sex, approximate_age_months, size, temperament, energy_level, vaccination_status, vaccinations_current_self_reported, verification_status)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Milo', 'dog', 'Golden Retriever', 'male', 36, 'large', array['Social','Gentle'], 4, 'verified', true, 'verified'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Pepper', 'dog', 'Indie', 'female', 24, 'medium', array['Curious','Energetic'], 5, 'verified', true, 'verified'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'Chai', 'cat', 'Indian Shorthair', 'female', 48, 'small', array['Calm','Independent'], 2, 'verified', true, 'verified'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'Bean', 'dog', 'Beagle', 'male', 60, 'medium', array['Foodie','Friendly'], 4, 'verified', true, 'verified'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'Luna', 'cat', 'Persian mix', 'female', 24, 'small', array['Sweet','Shy'], 2, 'unverified', null, 'unverified')
on conflict (id) do nothing;

insert into public.posts (id, author_id, pet_id, body, neighborhood_label, created_at) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Milo found his new favourite sunrise spot. Anyone up for an easy Cubbon Park loop this Sunday?', 'Cubbon Park', now() - interval '18 minutes'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Tiny reminder: keep a bowl of fresh water near sunny windows. Chai has approved this message.', 'Domlur', now() - interval '1 hour'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Pepper graduated from her confidence class today. Proud of this brave little goofball.', 'Koramangala', now() - interval '3 hours')
on conflict (id) do nothing;

insert into public.activities (id, host_id, type, title, description, starts_at, capacity, neighborhood_label, approximate_location) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'walk', 'Sunday sniff walk', 'An easy, shaded loop for social dogs.', now() + interval '3 days', 10, 'Cubbon Park', extensions.st_point(77.5929, 12.9763)::extensions.geography),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'playdate', 'Puppy social hour', 'A supervised small-group playdate.', now() + interval '2 days', 8, 'Indiranagar', extensions.st_point(77.6408, 12.9784)::extensions.geography)
on conflict (id) do nothing;

insert into public.activity_attendance (activity_id, profile_id, pet_id, status) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'approved'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'pending')
on conflict (activity_id, profile_id) do nothing;

insert into public.conversations (id) values
  ('60000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.conversation_members (conversation_id, profile_id, last_read_at) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', now()),
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', now() - interval '20 minutes')
on conflict (conversation_id, profile_id) do nothing;

insert into public.direct_conversations (conversation_id, first_profile_id, second_profile_id)
values ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')
on conflict (conversation_id) do nothing;

insert into public.messages (id, conversation_id, sender_id, body, created_at) values
  ('61000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Would Pepper enjoy the shaded Sunday loop?', now() - interval '24 minutes'),
  ('61000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Absolutely—Milo will be there at 7:30.', now() - interval '18 minutes')
on conflict (id) do nothing;

insert into public.lost_found_alerts (id, creator_id, kind, title, description, last_seen_at, approximate_location, neighborhood_label)
values ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'found', 'Friendly brown Indie found', 'Safe with a nearby pet parent. Contact through Wilver chat.', now() - interval '2 hours', extensions.st_point(77.6211, 12.9344)::extensions.geography, 'Koramangala')
on conflict (id) do nothing;

insert into public.reports (id, reporter_id, target_type, target_id, reason, details)
values ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'post', '20000000-0000-0000-0000-000000000003', 'possible misinformation', 'Demo moderation report for the admin queue.')
on conflict (id) do nothing;

insert into public.notifications (id, recipient_id, actor_id, kind, entity_type, entity_id, payload, created_at) values
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'message', 'conversation', '60000000-0000-0000-0000-000000000001', '{"preview":"Would Pepper enjoy the shaded Sunday loop?"}'::jsonb, now() - interval '24 minutes'),
  ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'alert', 'alert', '40000000-0000-0000-0000-000000000001', '{"distance_band":"1–3 km"}'::jsonb, now() - interval '2 hours')
on conflict (id) do nothing;

insert into public.breeding_profiles (
  id, pet_id, owner_id, region_code, health_summary, genetic_tests,
  responsible_breeding_acknowledged_at, status, is_active, reviewed_by, reviewed_at
) values (
  '80000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'IN-KA',
  'FICTIONAL DEMO RECORD — reviewed health summary for product testing only.',
  array['FICTIONAL hip screen','FICTIONAL genetic panel'],
  now() - interval '30 days', 'verified', false,
  '00000000-0000-0000-0000-000000000006', now() - interval '7 days'
)
on conflict (id) do nothing;

insert into public.verification_documents (
  id, owner_id, pet_id, breeding_profile_id, document_type, private_storage_path,
  status, reviewed_by, reviewed_at
) values (
  '81000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000001',
  'fictional_demo_health_record', 'demo-private/fictional-milo-health.pdf',
  'verified', '00000000-0000-0000-0000-000000000006', now() - interval '7 days'
)
on conflict (id) do nothing;

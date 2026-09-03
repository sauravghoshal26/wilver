begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'approximate_location', 'select'),
  'authenticated clients cannot select coarse geography'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'is_admin', 'update'),
  'members cannot grant themselves administrator access'
);
select ok(
  not has_column_privilege('authenticated', 'public.pets', 'verification_status', 'update'),
  'owners cannot self-verify pets'
);
select ok(
  not has_column_privilege('authenticated', 'public.pets', 'vaccination_status', 'update'),
  'owners cannot self-verify vaccination evidence'
);
select ok(
  not has_table_privilege('authenticated', 'public.activities', 'insert'),
  'activities are created only through the validated RPC'
);
select ok(
  not has_table_privilege('authenticated', 'public.connections', 'update'),
  'connection decisions are handled by the validated RPC'
);
select ok(
  not has_table_privilege('authenticated', 'public.alert_sightings', 'insert'),
  'sightings derive location server-side'
);
select ok(
  has_function_privilege('authenticated', 'public.nearby_profiles_for_me(integer, integer)', 'execute'),
  'members can use privacy-safe discovery'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

select results_eq(
  $$select profile_id from public.private_locations order by profile_id$$,
  $$values ('00000000-0000-0000-0000-000000000001'::uuid)$$,
  'RLS reveals only the caller private location row'
);

select ok(
  not exists (
    select 1 from public.nearby_profiles_for_me(50000, 100)
    where distance_meters <= 0 or mod(distance_meters::numeric, 500) <> 0
  ),
  'discovery returns positive distances rounded to 500 metre bands'
);

select throws_like(
  $$insert into public.activities (host_id, type, title, description, starts_at, capacity, neighborhood_label)
    values ('00000000-0000-0000-0000-000000000001', 'walk', 'Bypass', 'Must fail', now() + interval '1 day', 4, 'Private')$$,
  '%permission denied%',
  'direct activity creation is denied'
);

select throws_like(
  $$insert into public.pet_photos (pet_id, storage_path, position)
    values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002/stolen/photo.jpg', 0)$$,
  '%media path owner mismatch%',
  'an owner cannot attach another account storage path'
);

select * from finish();
rollback;

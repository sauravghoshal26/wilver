# Technical architecture

## Runtime shape

```text
Expo iOS / Android client
  ├── Expo Router + deep links
  ├── Supabase Auth session in SecureStore
  ├── TanStack Query fetch/invalidation
  ├── Zustand session-aware UI mirror
  └── sanitized media + explicit location/push permissions
                 │ authenticated JWT
                 ▼
Supabase
  ├── Auth + email confirmation/recovery
  ├── PostgreSQL + PostGIS + row-level security
  ├── security-definer workflow RPCs
  ├── Realtime on privacy-safe tables only
  ├── public/private Storage buckets
  └── Edge Functions for deletion and push delivery
```

There is one production repository boundary at `src/data/productionRepository.ts`. It performs real Supabase queries and RPCs; no local data repository or fake-user fallback exists. The mobile client uses only a publishable key and is never an authorization boundary.

## Trust boundaries

- Exact coordinates live only in `private_locations`. The discovery RPC derives its origin from the caller’s JWT, withholds geography, and rounds returned distance up to 500-metre bands.
- `profiles.approximate_location`, activity geography, alert geography, private meeting points, push tokens, health records, and verification records are withheld by column privileges and RLS.
- Profiles, activities and lost/found tables are intentionally excluded from Realtime publication because their raw rows contain geography. Safe related tables trigger query invalidation instead.
- Direct connection, attendance, activity, lost/found and moderation state changes use validated server functions. Security-owned columns are not writable by ordinary members.
- Activity meeting instructions are stored separately and are readable only by the host, an approved attendee, or an administrator.
- Blocks remove connections and prevent discovery, feed interaction, conversation access and media reads between the two accounts.

## Media

Selected still images are resized and re-encoded to JPEG on-device before upload, removing EXIF/GPS metadata. Storage paths are always `userId/entityId/uuid.jpg`, and database triggers reject another user’s path.

- `avatars`, `pet-photos`: public transformed images, owner write.
- `post-media`, `alert-media`, `message-media`: private buckets, RLS reads, signed client URLs.
- `verification-documents`: private owner upload and administrator read; unused by the launch client while verification operations are not staffed.

Replacement and deletion workflows remove old objects where possible. The protected account-deletion function removes every user-prefixed object from all six buckets before deleting the Auth identity and cascading database records.

Client-side re-encoding is privacy hygiene, not malware scanning. Production must add server-side content-type validation/moderation and provider-side scanning before high-volume public launch.

## Realtime and notifications

The client subscribes only to messages, notifications, connections, attendance, pets, posts, likes and comments. Realtime events invalidate the authenticated query snapshot.

Database triggers create privacy-safe notification rows. A secret-authenticated database webhook invokes `push-notification`; the function loads enabled device tokens with the service role and sends generic lock-screen copy through Expo Push. Message bodies, exact locations and private meeting details are never placed in push content. Invalid device tokens are disabled.

## Authentication and lifecycle

Email/password signup requires email confirmation. Custom-scheme callbacks support PKCE and implicit-token links; recovery links route to a dedicated password-update screen. Native sessions persist in SecureStore and push tokens are disabled on logout.

Onboarding atomically records age confirmation, versioned Terms/Privacy consent, the profile, optional private GPS, coarse server geography, and the first pet. Optional pet-photo failure does not roll back a completed identity; the user can retry later.

## Testing

- Vitest covers business rules, auth-link parsing, pet-age conversion and static security contracts.
- pgTAP covers column grants, RPC availability, exact-location isolation, rounded discovery and denied workflow bypasses.
- Expo Doctor and Expo dependency validation protect native-build compatibility.
- Still required before public release: physical-device E2E, accessibility, poor-network tests, push/deep-link tests, load tests, independent RLS/security review and store review builds.

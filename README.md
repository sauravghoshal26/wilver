# Wilver

Wilver is a privacy-first local community app for adult pet parents, built for iOS and Android with Expo SDK 57 and Supabase/PostGIS. The client does not contain demo accounts, fake messages, fixed GPS coordinates, or a fallback backend.

## Current status

This repository contains a production-connected application and deployable backend, not a public production deployment. Real authentication, profiles, pets, media, feed interactions, approximate discovery, connections, activities, realtime chat, lost/found sightings, push delivery, reporting, moderation, blocking, privacy controls, and account deletion are implemented.

Public launch is intentionally gated until the external items in [Launch](docs/LAUNCH.md) are completed: provisioned Supabase and EAS projects, executed RLS tests, final legal documents, verified support/moderation operations, store credentials, observability, device QA, and an independent security review.

Responsible breeding is disabled by default and cannot be submitted from the client. It must remain disabled until separate legal and animal-welfare approval.

## Local setup

Requirements: Node 22 LTS, npm, Docker Desktop, Xcode or Android Studio, and optionally a physical device for push testing.

```bash
nvm use
npm ci
cp .env.example .env.local
npx supabase start
npx supabase db reset
npx supabase test db
npm start
```

Copy the local Supabase URL and publishable key reported by `npx supabase status` into `.env.local`. The local seed contains explicitly fictional development fixtures; they are never bundled into the app and must never be applied to production.

Without valid public Supabase environment values, Wilver stays on the welcome screen and shows a customer-friendly temporary-unavailability message. It never fabricates a signed-in user.

## Required public environment

```text
EXPO_PUBLIC_ENVIRONMENT=development|staging|production
EXPO_PUBLIC_SUPABASE_URL=https://project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
EXPO_PUBLIC_EAS_PROJECT_ID=...
EXPO_PUBLIC_TERMS_VERSION=...
EXPO_PUBLIC_PRIVACY_VERSION=...
```

Production signup is automatically paused while either legal version starts with `draft-`. Never add a service-role or secret key to an `EXPO_PUBLIC_` variable.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npx expo install --check
npx expo-doctor
npx supabase test db
```

The JavaScript checks currently cover 16 cases. `supabase/tests/rls.sql` adds 12 database permission and isolation checks when the local Supabase stack is available.

## Project structure

```text
app/                        Expo Router screens and deep links
assets/                     Bundled brand and offline startup assets
src/components/             Reusable UI and motion primitives
src/config/                 Public environment and renameable brand values
src/data/                   Supabase production repository
src/lib/                    Auth links, media, location, push and rules
src/store/                  Session-aware server-state mirror
src/types/                  Domain models
supabase/migrations/         PostgreSQL, PostGIS, RLS, RPCs and Storage policies
supabase/functions/          Account deletion and push webhook functions
supabase/tests/              Executable pgTAP isolation tests
supabase/seed.sql            Local-only fictional fixtures
tests/                       Unit and static security contracts
docs/                        Architecture, safety, product and release gates
```

Start with [Architecture](docs/ARCHITECTURE.md), [Safety](docs/SAFETY.md), and [Launch](docs/LAUNCH.md).

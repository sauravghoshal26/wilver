# Deployment and launch checklist

Wilver is code-complete enough for a staging deployment, but it is not publicly production-ready until every release gate below has evidence and an owner.

## 1. Backend environments

- Create separate Supabase development, staging and production projects in approved regions.
- Link staging, run `npx supabase db push`, then run `npx supabase test db` against a reset local stack and the staging migration chain.
- Never apply `supabase/seed.sql` to production.
- Deploy `delete-account` with JWT verification enabled.
- Deploy `push-notification` with JWT verification disabled only because it requires a strong `x-webhook-secret`.
- Set function secrets: `DATABASE_WEBHOOK_SECRET`, optional `EXPO_ACCESS_TOKEN`, and provider-managed Supabase secrets. Never expose the service role to the app.
- Create an INSERT database webhook on `public.notifications` pointing to the push function and set the exact `x-webhook-secret` header.
- Configure Auth redirect URLs for `wilver://auth/callback` and `wilver://auth/reset-password`, production SMTP, branded templates, breached-password protection and CAPTCHA/rate limits.
- Verify backups, point-in-time recovery, log retention, budget alerts and incident access.

## 2. Legal and operations

- Replace `draft-*` Terms and Privacy environment versions with counsel-approved published versions. Production signup stays blocked until this is done.
- Confirm the support email/domain, privacy request channel, retention schedule, subprocessors, governing law and regional rights text.
- Staff moderation and define critical/high/standard SLAs, appeals, evidence retention and emergency escalation.
- Keep responsible breeding disabled in the database and store metadata.
- Commission independent mobile/API/RLS penetration testing; close all critical and high findings.

## 3. Mobile release

- Create the EAS project and set `EXPO_PUBLIC_EAS_PROJECT_ID` plus Supabase public values in each EAS environment.
- Confirm Apple bundle ID and Google package ownership; replace identifiers before the first irreversible store release if the company will use different IDs.
- Run `npx expo-doctor`, all app tests and database tests on Node 22.
- Build internal releases with `eas build --platform all --profile preview` and exercise signup, confirmation, recovery, denied GPS/photo/push permissions, background/resume, offline recovery, signed media, push taps and account deletion on physical devices.
- Complete VoiceOver/TalkBack, font scaling, contrast, reduced-motion, keyboard, low-memory and poor-network QA.
- Add crash/error monitoring and privacy-reviewed product analytics; prove alert delivery without collecting message text or exact coordinates.
- Build production with `eas build --platform all --profile production`, submit, and use staged/phased rollout.

## 4. Store readiness

- Final icon, screenshots, support URL, marketing site and privacy-safe preview media
- Published privacy policy, Terms, community guidelines and web account-deletion instructions
- Apple privacy manifest/App Privacy answers and Google Play Data Safety declaration
- Content rating, location-purpose copy and a complete location-denied experience
- Review credentials with staging content—never production member data
- Report, block, moderation and account deletion evidence for reviewers
- No claims that verification, emergency response or veterinary advice is provided unless those operations genuinely exist

## Release gates

Do not launch publicly until:

1. All app, Expo Doctor and pgTAP tests pass from a clean checkout.
2. A two-user staging isolation test confirms location, blocks, private media and meeting-point boundaries.
3. Account deletion has been exercised end to end, including every Storage bucket.
4. Push webhook authentication, token cleanup and privacy-safe copy are verified on iOS and Android.
5. Legal documents and store disclosures are approved and published.
6. Moderation/support are staffed and an incident drill has completed.
7. Crash-free staging sessions exceed the agreed threshold and no critical/high security issue is open.

# Customer preview runbook

This runbook creates a genuine, shareable Wilver preview. It uses real accounts, real data isolation and real realtime features. It does not add a demo mode or ship shared credentials.

## Preview standard

- Use a dedicated Supabase staging project. Never connect a public preview to development or production member data.
- Let visitors create their own account and complete onboarding. Keep email confirmation enabled with a branded sender.
- Prepare three founder-controlled accounts with unique randomly generated passwords. Use them only to create clearly fictional, locally relevant starter content through the app.
- Never publish those account credentials. The preview should work for a visitor as a new first user.
- Keep responsible breeding disabled. The current screen accurately explains the review gate; it is not an open marketplace.

## One-time staging setup

1. Sign in with `npx supabase login`, create or select the staging project, then link it with `npx supabase link --project-ref <staging-ref>`.
2. Apply the schema with `npx supabase db push`.
3. Deploy `delete-account` with normal JWT verification.
4. Deploy `push-notification` with JWT verification disabled only after setting a strong `DATABASE_WEBHOOK_SECRET` and matching `x-webhook-secret` on the `public.notifications` insert webhook.
5. In Supabase Auth, add `wilver://auth/callback` and `wilver://auth/reset-password` as redirect URLs. Configure branded confirmation and password-reset email templates, production SMTP, rate limits and breached-password protection.
6. Copy the staging URL and publishable key into `.env.local`. Do not put a service-role key in Expo or any `EXPO_PUBLIC_*` variable.
7. Sign in with `npx eas-cli login`, run `npx eas-cli init`, and configure the EAS project ID and the three public staging values for the `preview` environment.

## Customer-ready content

Create starter content through the real product so every row follows the same authorization path as customer content:

- three complete pet-parent profiles in the intended launch city;
- at least one cat and one dog, using licensed or founder-owned photos;
- four friendly feed posts, one future walk, one playdate and one resolved lost/found example;
- one accepted connection and a short safe conversation between founder accounts;
- no real addresses, phone numbers, medical claims or private customer information.

The first visitor must still see honest empty states for their own messages and connections. Starter content should make discovery and the community feed feel alive without pretending the visitor has existing relationships.

## Build and share

Run the complete checks on Node 22:

```bash
npm run check
npx expo-doctor
npx supabase test db
```

Then build internal iOS and Android previews:

```bash
npx eas-cli build --platform all --profile preview
```

For a web preview, configure the same staging public environment variables before exporting and deploy the generated static build behind HTTPS with SPA route fallback to `index.html`.

## Acceptance journey

Test on a fresh email and a physical phone:

1. Create account, confirm email and log in.
2. Complete onboarding with GPS allowed, then repeat with GPS denied and manual area entry.
3. Add a pet photo and confirm the profile appears only at approximate-area precision to another account.
4. Create a post, like and comment from a second account, and verify realtime refresh.
5. Request a connection, accept it, message in realtime and block the second account.
6. Create an activity, request attendance and confirm private meeting instructions are visible only after approval.
7. Create and resolve a lost-pet alert; verify sightings are private to the alert owner.
8. Enable push on a physical device and open each supported notification route.
9. Exercise reporting and the protected moderation console.
10. Delete the fresh account and verify auth, database rows, device tokens and storage objects are removed according to policy.

A public URL is not enough by itself. The preview is ready to share only when this full journey passes without privileged manual repair.

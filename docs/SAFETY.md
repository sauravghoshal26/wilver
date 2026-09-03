# Privacy, safety and moderation

## Product rules

- Do not publish exact home locations, private phone numbers or raw health documents.
- Location permission is optional and requested in context. Discovery works with a manually selected approximate neighborhood.
- Exact activity locations are released only after host approval.
- Users can block or report every user-generated object and direct-message participant.
- Database policy checks recipient message preferences and accepted connections before a conversation invitation.
- Database triggers limit message bursts and report abuse; production edge/WAF limits should add IP/device-aware protection.
- Lost/found contact stays inside Wilver by default.
- Account deletion must remove public content or disassociate it according to the retention policy.
- The `delete-account` Edge Function authenticates the caller and performs Auth deletion only with a server secret; deploy it after finalizing media-retention rules.
- Underage users are not eligible. Sensitive modules require explicit adult confirmation and stronger verification before launch.

## Responsible breeding

Breeding is a disabled-by-default feature flag, not an animal marketplace. Activation requires an adult owner, a verified parent and pet, approved region, veterinary/health evidence, policy acknowledgement and administrator review. The MVP prohibits direct animal sales and paid placement. The entire module must remain removable without affecting community features.

Before enabling it, obtain country/state-specific legal advice and independent animal-welfare review. Define disallowed breeds/conditions where appropriate, verification expiry, litter frequency safeguards, complaint escalation and permanent bans for commercial exploitation.

## Moderation operations

Recommended severity levels:

- **Critical:** credible threats, animal abuse, exploitation, doxxing, scam involving imminent harm. Hide content immediately, preserve evidence and escalate to trained staff.
- **High:** harassment, repeated unsafe meetup behavior, fraudulent verification, irresponsible breeding solicitation. Restrict relevant features during review.
- **Standard:** spam, misinformation, off-topic content, duplicate listings. Queue with contextual signals.

Targets: critical acknowledgement under 15 minutes during staffed hours; high under four hours; standard under 24 hours. These are product targets, not legal guarantees.

Moderators need least-privilege access, mandatory reasons, immutable audit records, conflict-of-interest controls and an appeals workflow. Never expose reporters to reported users.

## Security checklist

- Rate-limit auth, messages, comments, reports and location queries at the edge.
- Reject unexpected MIME types and scan uploads; strip metadata before publishing.
- Use signed URLs and short expirations for documents and private chat media.
- Store service-role keys only in trusted functions/CI.
- Alert on bulk profile queries, repeated coordinate probing, report abuse and admin privilege changes.
- Back up PostgreSQL and test point-in-time recovery.
- Commission independent mobile/API penetration testing before public launch.

Wilver is not an emergency service and does not replace veterinary, legal or animal-control advice.

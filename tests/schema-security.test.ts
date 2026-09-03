import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/0001_initial.sql'), 'utf8').toLowerCase();

describe('database security contract', () => {
  it('enables RLS on every sensitive table', () => {
    for (const table of ['profiles', 'private_locations', 'pet_private_health', 'messages', 'verification_documents', 'reports', 'moderation_actions', 'device_tokens']) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it('isolates exact locations and gates breeding', () => {
    expect(migration).toContain('create table public.activity_private_locations');
    expect(migration).toContain('approved attendees read meeting point');
    expect(migration).toContain("f.key = 'breeding' and f.enabled");
    expect(migration).toContain('p.is_adult');
  });

  it('protects moderation-owned profile fields', () => {
    expect(migration).toContain('protect_profile_security_fields');
    expect(migration).toContain('new.is_admin := old.is_admin');
    expect(migration).toContain('new.status := old.status');
  });
});


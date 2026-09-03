import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const safetyMigration = readFileSync(resolve(process.cwd(), 'supabase/migrations/0002_safety_workflows.sql'), 'utf8').toLowerCase();
const productionMigration = readFileSync(resolve(process.cwd(), 'supabase/migrations/0003_production_core.sql'), 'utf8').toLowerCase();
const deletionFunction = readFileSync(resolve(process.cwd(), 'supabase/functions/delete-account/index.ts'), 'utf8');

describe('safety workflow contract', () => {
  it('enforces message eligibility and anti-spam at the database', () => {
    expect(safetyMigration).toContain('can_invite_to_conversation');
    expect(safetyMigration).toContain("target_profile.allow_messages <> 'nobody'");
    expect(safetyMigration).toContain('messages_rate_limit');
    expect(safetyMigration).toContain("interval '1 minute'");
  });

  it('writes moderation decisions through an atomic server function', () => {
    expect(safetyMigration).toContain('create or replace function public.moderate_report');
    expect(safetyMigration).toContain('for update');
    expect(safetyMigration).toContain('insert into public.moderation_actions');
    expect(safetyMigration).toContain('administrator access required');
  });

  it('deletes authenticated accounts only from a service-role edge function', () => {
    expect(deletionFunction).toContain("request.headers.get('Authorization')");
    expect(deletionFunction).toContain("Deno.env.get('SUPABASE_SECRET_KEY')");
    expect(deletionFunction).toContain("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')");
    expect(deletionFunction).toContain('admin.deleteUser(user.id)');
    expect(deletionFunction).toContain('deleteOwnedStorage(adminClient, user.id)');
    expect(deletionFunction).toContain("'verification-documents'");
    expect(deletionFunction).not.toContain('console.log');
  });

  it('allows first onboarding before requiring active-member status', () => {
    const onboarding = productionMigration.slice(
      productionMigration.indexOf('create or replace function public.complete_onboarding'),
      productionMigration.indexOf('create or replace function public.set_my_location'),
    );
    expect(onboarding).not.toContain('if not public.is_active_member()');
    expect(onboarding).toContain("p.status <> 'active'");
    expect(onboarding).toContain('invalid pet id');
  });

  it('withholds direct writes handled by trusted workflow functions', () => {
    expect(productionMigration).toContain('revoke insert, update on public.connections from authenticated');
    expect(productionMigration).toContain('revoke insert, update on public.activity_attendance from authenticated');
    expect(productionMigration).toContain('revoke insert, update, delete on public.activities from authenticated');
    expect(productionMigration).toContain('revoke insert, update, delete on public.lost_found_alerts from authenticated');
  });
});

import { describe, expect, it } from 'vitest';

import { customerAuthError, customerDataError } from '@/src/lib/customerErrors';

describe('customer-safe errors', () => {
  it('does not expose database policy details', () => {
    expect(customerDataError({ message: 'new row violates row-level security policy for table private_locations' }, 'Unable to save')).toBe('You don’t have permission to do that.');
  });

  it('translates common authentication failures', () => {
    expect(customerAuthError({ message: 'Invalid login credentials' })).toBe('That email or password is incorrect.');
  });

  it('uses the supplied safe fallback for unknown internals', () => {
    expect(customerDataError({ message: 'postgres operator 42883 does not exist' }, 'Unable to load your circle')).toBe('Unable to load your circle');
  });
});

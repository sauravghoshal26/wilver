import { describe, expect, it } from 'vitest';

import { canActivateBreedingProfile, canReceiveMessage, distanceBand } from '@/src/lib/privacy';

describe('privacy helpers', () => {
  it('shows a distance band instead of false precision', () => {
    expect(distanceBand(0.2)).toBe('Under 500 m away');
    expect(distanceBand(2.4)).toBe('1–3 km away');
    expect(distanceBand(11)).toBe('10+ km away');
  });

  it('respects message preferences', () => {
    expect(canReceiveMessage('everyone', false)).toBe(true);
    expect(canReceiveMessage('connections', false)).toBe(false);
    expect(canReceiveMessage('connections', true)).toBe(true);
    expect(canReceiveMessage('nobody', true)).toBe(false);
  });

  it('requires every responsible-breeding gate', () => {
    const validGate = {
      featureEnabled: true,
      adultConfirmed: true,
      petVerified: true,
      profileVerified: true,
      allowedRegion: true,
      acknowledged: true,
    };
    expect(canActivateBreedingProfile(validGate)).toBe(true);
    expect(canActivateBreedingProfile({ ...validGate, adultConfirmed: false })).toBe(false);
    expect(canActivateBreedingProfile({ ...validGate, featureEnabled: false })).toBe(false);
  });
});


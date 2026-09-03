export type MessagePreference = 'nobody' | 'connections' | 'everyone';

export function distanceBand(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new Error('Distance must be a non-negative number');
  if (distanceKm < 0.5) return 'Under 500 m away';
  if (distanceKm < 1) return 'Under 1 km away';
  if (distanceKm < 3) return '1–3 km away';
  if (distanceKm < 5) return '3–5 km away';
  if (distanceKm < 10) return '5–10 km away';
  return '10+ km away';
}

export function canReceiveMessage(preference: MessagePreference, connected: boolean): boolean {
  if (preference === 'everyone') return true;
  if (preference === 'connections') return connected;
  return false;
}

export type BreedingGate = {
  featureEnabled: boolean;
  adultConfirmed: boolean;
  petVerified: boolean;
  profileVerified: boolean;
  allowedRegion: boolean;
  acknowledged: boolean;
};

export function canActivateBreedingProfile(gate: BreedingGate): boolean {
  return Object.values(gate).every(Boolean);
}


import { describe, expect, it } from 'vitest';

import { ageTextToMonths } from '@/src/lib/petAge';

describe('pet age parsing', () => {
  it('distinguishes months from years', () => {
    expect(ageTextToMonths('6 months')).toBe(6);
    expect(ageTextToMonths('2 years')).toBe(24);
    expect(ageTextToMonths('1.5 yr')).toBe(18);
  });

  it('rejects invalid values and caps implausible ages', () => {
    expect(ageTextToMonths('unknown')).toBeNull();
    expect(ageTextToMonths('-2 years')).toBeNull();
    expect(ageTextToMonths('99 years')).toBe(480);
  });
});

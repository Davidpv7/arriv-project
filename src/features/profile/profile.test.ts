import { COUNTRIES } from '../onboarding/countries';

import { initials, monthYear } from './format';
import { cityCode, dayCount, findCountry, searchCountries, todayIso } from './places';
import { arrivalSchema, handleSchema, visaSchema } from './schemas';

describe('dayCount', () => {
  const today = new Date(2026, 10, 25); // 25 Nov 2026, local time

  it('counts the arrival day as day 1', () => {
    expect(dayCount('2026-11-25', today)).toBe(1);
    expect(dayCount('2026-11-24', today)).toBe(2);
  });

  it('counts across a year and a leap day', () => {
    expect(dayCount('2024-02-28', new Date(2024, 2, 1))).toBe(3); // 28 Feb, 29 Feb, 1 Mar
    expect(dayCount('2025-10-09', today)).toBe(413);
  });

  it('returns null for future or missing dates', () => {
    expect(dayCount('2026-12-01', today)).toBeNull();
    expect(dayCount(null, today)).toBeNull();
  });
});

describe('places', () => {
  it('maps cities to airport codes, AUS when unknown', () => {
    expect(cityCode('Sydney')).toBe('SYD');
    expect(cityCode(' melbourne ')).toBe('MEL');
    expect(cityCode('Wollongong')).toBe('AUS');
    expect(cityCode(null)).toBe('AUS');
  });

  it('has every country once with 2- and 3-letter codes', () => {
    expect(COUNTRIES.length).toBeGreaterThan(240);
    expect(new Set(COUNTRIES.map((c) => c.alpha2)).size).toBe(COUNTRIES.length);
    for (const c of COUNTRIES) {
      expect(c.alpha2).toMatch(/^[A-Z]{2}$/);
      expect(c.alpha3).toMatch(/^[A-Z]{3}$/);
    }
    expect(findCountry('br')?.alpha3).toBe('BRA');
  });

  it('searches by code first, then name prefix, then contains', () => {
    expect(searchCountries('bra')[0]?.alpha2).toBe('BR');
    expect(searchCountries('ind')[0]?.alpha2).toBe('IN');
    expect(searchCountries('korea').map((c) => c.alpha2)).toContain('KR');
    expect(searchCountries('   ')).toEqual([]);
  });
});

describe('format', () => {
  it('makes initials', () => {
    expect(initials('Ana Costa')).toBe('AC');
    expect(initials('Mateo de la Rosa')).toBe('MR');
    expect(initials('lina')).toBe('LI');
  });

  it('formats month and year for the passport', () => {
    expect(monthYear('2025-03-14')).toBe('MAR 2025');
    expect(monthYear('2024-06-01')).toBe('JUN 2024');
    expect(monthYear('2024-09-30')).toBe('SEP 2024');
    expect(monthYear(null)).toBeNull();
  });
});

describe('profile schemas', () => {
  it('accepts valid handles and lowercases them', () => {
    expect(handleSchema.parse('Ana_Costa')).toBe('ana_costa');
    expect(handleSchema.safeParse('ab').success).toBe(false);
    expect(handleSchema.safeParse('has space').success).toBe(false);
    expect(handleSchema.safeParse('a'.repeat(21)).success).toBe(false);
  });

  it('rejects arrival dates in the future or that do not exist', () => {
    expect(arrivalSchema.safeParse('2025-03-14').success).toBe(true);
    expect(arrivalSchema.safeParse('2999-01-01').success).toBe(false);
    expect(arrivalSchema.safeParse('2025-13-40').success).toBe(false);
    expect(arrivalSchema.safeParse('2025-02-30').success).toBe(false);
    expect(arrivalSchema.safeParse('2024-02-29').success).toBe(true);
    expect(arrivalSchema.safeParse(todayIso()).success).toBe(true);
  });

  it('allows an empty visa or a 3-digit subclass only', () => {
    const base = { label: '', visibility: 'connections' as const };
    expect(visaSchema.safeParse({ ...base, subclass: '' }).success).toBe(true);
    expect(visaSchema.safeParse({ ...base, subclass: '500' }).success).toBe(true);
    expect(visaSchema.safeParse({ ...base, subclass: '50' }).success).toBe(false);
  });
});

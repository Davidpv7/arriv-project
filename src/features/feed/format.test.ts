import i18n from '@/i18n';

import { asStampColor, communityInitials, gateCode, relativeTime } from './format';

describe('relativeTime', () => {
  const t = i18n.t.bind(i18n);
  const now = new Date(2026, 10, 25, 12, 0, 0);
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it('uses short units for recent posts', () => {
    expect(relativeTime(t, ago(20_000), now)).toBe('Now');
    expect(relativeTime(t, ago(5 * 60_000), now)).toBe('5m');
    expect(relativeTime(t, ago(3 * 3_600_000), now)).toBe('3h');
    expect(relativeTime(t, ago(2 * 86_400_000), now)).toBe('2d');
  });

  it('shows a date after a week, with the year only when different', () => {
    expect(relativeTime(t, new Date(2026, 2, 14, 9).toISOString(), now)).toBe('14 Mar');
    expect(relativeTime(t, new Date(2025, 11, 1, 9).toISOString(), now)).toBe('1 Dec 2025');
  });
});

describe('community helpers', () => {
  it('makes stamp initials from meaningful words', () => {
    expect(communityInitials('Sydney Newcomers')).toBe('SN');
    expect(communityInitials('Latinos en Sydney')).toBe('LS');
    expect(communityInitials('Student Visa 500 Crew')).toBe('SV');
    expect(communityInitials('Brasileiros na Austrália')).toBe('BA');
    expect(communityInitials('Perth')).toBe('PE');
  });

  it('uses airport gates, AU for Australia-wide', () => {
    expect(gateCode('Sydney')).toBe('SYD');
    expect(gateCode('Wollongong')).toBe('WOL');
    expect(gateCode(null)).toBe('AU');
  });

  it('falls back to tangerine for unknown stamp colours', () => {
    expect(asStampColor('sky')).toBe('sky');
    expect(asStampColor('purple')).toBe('tangerine');
  });
});

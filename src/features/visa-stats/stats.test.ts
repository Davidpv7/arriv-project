import { cleanSubclass, formatMonth, isEmptyStats, parseVisaStats } from './stats';

const empty = {
  subclass: '500',
  min_group: 5,
  waiting: null,
  granted_7d: null,
  granted_30d: null,
  wait_days: null,
  weekly_grants: null,
  waiting_by_month: [],
};

describe('visa stats', () => {
  it('reads the totals the database returns', () => {
    const s = parseVisaStats({
      ...empty,
      waiting: 12,
      granted_30d: 6,
      wait_days: { people: 6, p25: 20, median: 31, p75: 44 },
      weekly_grants: [0, 1, 0, 2, 0, 0, 1, 0, 0, 1, 0, 1],
      waiting_by_month: [{ month: '2026-10', people: 7 }],
    });
    expect(s?.wait_days?.median).toBe(31);
    expect(s && isEmptyStats(s)).toBe(false);
  });

  it('knows when there is nothing to show yet', () => {
    const s = parseVisaStats(empty);
    expect(s && isEmptyStats(s)).toBe(true);
  });

  it('rejects anything else', () => {
    expect(parseVisaStats(null)).toBeNull();
    expect(parseVisaStats({ subclass: '500' })).toBeNull();
    expect(parseVisaStats({ ...empty, waiting: -1 })).toBeNull();
  });

  it('formats months and subclasses', () => {
    expect(formatMonth('2026-03')).toBe('Mar 2026');
    expect(cleanSubclass(' 500 ')).toBe('500');
    expect(cleanSubclass('50')).toBeNull();
    expect(cleanSubclass(null)).toBeNull();
  });
});

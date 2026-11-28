import { todayIso } from '@/features/profile/places';

import {
  daysUntil,
  formatDay,
  formStatus,
  milestoneFormSchema,
  splitJourney,
  stampInk,
  stampLines,
  toMilestoneRow,
  type MilestoneFormInput,
} from './rules';

const base: MilestoneFormInput = {
  kind: 'visa',
  title: 'Student visa granted',
  status: 'done',
  happenedOn: '2026-02-01',
  dueOn: null,
  remindOn: null,
  visaSubclass: '500',
  place: '',
  notes: '',
  visibility: 'private',
  lodgedOn: null,
  shareStats: false,
};

const issues = (input: MilestoneFormInput) => {
  const r = milestoneFormSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}:${i.message}`);
};

describe('milestoneFormSchema', () => {
  it('accepts a done stamp and an upcoming item', () => {
    expect(issues(base)).toEqual([]);
    expect(
      issues({
        ...base,
        status: 'upcoming',
        happenedOn: null,
        dueOn: '2099-03-15',
        remindOn: '2099-02-15',
      }),
    ).toEqual([]);
  });

  it('needs the right date for the status', () => {
    expect(issues({ ...base, happenedOn: null })).toEqual([
      'happenedOn:journey.errors.dateRequired',
    ]);
    expect(issues({ ...base, happenedOn: '2099-01-01' })).toEqual([
      'happenedOn:journey.errors.dateFuture',
    ]);
    expect(issues({ ...base, status: 'upcoming', happenedOn: null })).toEqual([
      'dueOn:journey.errors.dateRequired',
    ]);
    expect(issues({ ...base, happenedOn: '2026-02-30' })).toEqual([
      'happenedOn:journey.errors.date',
    ]);
  });

  it('keeps reminders between today and the due date', () => {
    const upcoming = {
      ...base,
      status: 'upcoming' as const,
      happenedOn: null,
      dueOn: '2099-03-15',
    };
    expect(issues({ ...upcoming, remindOn: '2099-04-01' })).toEqual([
      'remindOn:journey.errors.remindAfterDue',
    ]);
    expect(issues({ ...upcoming, remindOn: '2000-01-01' })).toEqual([
      'remindOn:journey.errors.remindPast',
    ]);
    expect(issues({ ...upcoming, remindOn: todayIso() })).toEqual([]);
  });

  it('keeps the place to a short code, in capitals', () => {
    expect(issues({ ...base, place: 'Sydney' })).toEqual(['place:journey.errors.place']);
    expect(issues({ ...base, place: 'S-Y' })).toEqual(['place:journey.errors.place']);
    expect(milestoneFormSchema.parse({ ...base, place: ' syd ' }).place).toBe('SYD');
    expect(milestoneFormSchema.parse({ ...base, place: '' }).place).toBeNull();
  });

  it('checks the title and subclass', () => {
    expect(issues({ ...base, title: '  ' })).toEqual(['title:journey.errors.titleRequired']);
    expect(issues({ ...base, visaSubclass: '50' })).toEqual([
      'visaSubclass:journey.errors.subclass',
    ]);
  });
});

describe('toMilestoneRow', () => {
  it('clears fields that do not apply', () => {
    const parsed = milestoneFormSchema.parse({
      ...base,
      kind: 'arrival',
      dueOn: '2099-01-01',
      remindOn: '2099-01-01',
      place: ' PER ',
    });
    expect(toMilestoneRow(parsed)).toMatchObject({
      happened_on: '2026-02-01',
      due_on: null,
      remind_on: null,
      visa_subclass: null, // not a visa stamp
      place: 'PER',
      notes: null,
    });
  });

  it('keeps the due and reminder dates for upcoming items', () => {
    const parsed = milestoneFormSchema.parse({
      ...base,
      status: 'upcoming',
      dueOn: '2099-03-15',
      remindOn: '2099-02-15',
    });
    expect(toMilestoneRow(parsed)).toMatchObject({
      happened_on: null,
      due_on: '2099-03-15',
      remind_on: '2099-02-15',
      visa_subclass: '500',
    });
  });
});

describe('lodged visas and stats', () => {
  const waiting = {
    ...base,
    status: 'waiting' as const,
    happenedOn: null,
    lodgedOn: '2026-03-01',
    shareStats: true,
  };

  it('a waiting visa needs a lodged date in the past', () => {
    expect(issues(waiting)).toEqual([]);
    expect(issues({ ...waiting, lodgedOn: null })).toEqual([
      'lodgedOn:journey.errors.dateRequired',
    ]);
    expect(issues({ ...waiting, lodgedOn: '2099-01-01' })).toEqual([
      'lodgedOn:journey.errors.lodgedFuture',
    ]);
    expect(issues({ ...waiting, kind: 'work' })).toEqual(['status:journey.errors.waitingVisa']);
  });

  it('a granted visa was lodged on or before the grant', () => {
    expect(issues({ ...base, lodgedOn: '2026-01-01' })).toEqual([]);
    expect(issues({ ...base, lodgedOn: '2026-03-01' })).toEqual([
      'lodgedOn:journey.errors.lodgedAfterGrant',
    ]);
  });

  it('saves waiting as upcoming with no due date, and shares only when it can', () => {
    expect(toMilestoneRow(milestoneFormSchema.parse(waiting))).toMatchObject({
      status: 'upcoming',
      due_on: null,
      remind_on: null,
      lodged_on: '2026-03-01',
      share_stats: true,
    });
    // No subclass: nothing to count it under.
    expect(
      toMilestoneRow(milestoneFormSchema.parse({ ...waiting, visaSubclass: '' })).share_stats,
    ).toBe(false);
    // A due item (e.g. visa expiry) never keeps a lodged date.
    const due = { ...waiting, status: 'upcoming' as const, dueOn: '2099-03-15' };
    expect(toMilestoneRow(milestoneFormSchema.parse(due))).toMatchObject({
      lodged_on: null,
      share_stats: false,
    });
  });

  it('reads a lodged upcoming item back as waiting', () => {
    expect(formStatus({ status: 'upcoming', lodged_on: '2026-03-01' })).toBe('waiting');
    expect(formStatus({ status: 'upcoming', lodged_on: null })).toBe('upcoming');
    expect(formStatus({ status: 'done', lodged_on: '2026-03-01' })).toBe('done');
  });
});

describe('dates and stamps', () => {
  it('formats days and counts down', () => {
    expect(formatDay('2026-03-14')).toBe('14 Mar 2026');
    expect(daysUntil('2026-12-25', '2026-11-26')).toBe(29);
    expect(daysUntil('2026-11-25', '2026-11-26')).toBe(-1);
  });

  it('sorts done stamps newest first and upcoming soonest first', () => {
    const m = (id: string, status: 'done' | 'upcoming', date: string) => ({
      id,
      status,
      happened_on: status === 'done' ? date : null,
      due_on: status === 'upcoming' ? date : null,
      created_at: '2026-01-01T00:00:00Z',
    });
    const { done, upcoming } = splitJourney([
      m('a', 'done', '2025-01-01'),
      m('b', 'upcoming', '2027-06-01'),
      m('c', 'done', '2026-01-01'),
      m('d', 'upcoming', '2027-01-01'),
    ]);
    expect(done.map((x) => x.id)).toEqual(['c', 'a']);
    expect(upcoming.map((x) => x.id)).toEqual(['d', 'b']);
  });

  it('builds the postmark face', () => {
    expect(stampInk('visa')).toBe('rust');
    expect(stampInk('work')).toBe('teal');
    expect(
      stampLines(
        { kind: 'visa', happened_on: '2026-02-01', visa_subclass: '500', place: null },
        'Visa',
      ),
    ).toEqual([
      { text: 'VISA', style: 'mono' },
      { text: '500', style: 'big' },
      { text: 'FEB 2026', style: 'mono' },
    ]);
    expect(
      stampLines({ kind: 'work', happened_on: null, visa_subclass: null, place: null }, 'Work'),
    ).toEqual([{ text: 'WORK', style: 'mono' }]);
  });
});

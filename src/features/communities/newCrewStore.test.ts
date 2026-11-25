import { detailsError, nameError, useNewCrew } from './newCrewStore';

describe('start-a-crew wizard rules', () => {
  it('needs a 3–40 character name', () => {
    expect(nameError('ab')).not.toBeNull();
    expect(nameError('   abc   ')).toBeNull();
    expect(nameError('x'.repeat(41))).not.toBeNull();
  });

  it('asks each kind for what it needs', () => {
    const base = { city: '', visaSubclass: '', language: '' };
    expect(detailsError({ ...base, kind: 'city' })).toBe('communities.wizard.errors.city');
    expect(detailsError({ ...base, kind: 'city', city: 'Perth' })).toBeNull();
    expect(detailsError({ ...base, kind: 'visa', visaSubclass: '48' })).toBe(
      'communities.wizard.errors.visa',
    );
    expect(detailsError({ ...base, kind: 'visa', visaSubclass: '482' })).toBeNull();
    expect(detailsError({ ...base, kind: 'language' })).toBe('communities.wizard.errors.language');
    expect(detailsError({ ...base, kind: 'language', language: 'es' })).toBeNull();
    // Culture and interest crews can be Australia-wide.
    expect(detailsError({ ...base, kind: 'culture' })).toBeNull();
    expect(detailsError({ ...base, kind: 'interest' })).toBeNull();
  });

  it('reset clears every answer', () => {
    useNewCrew.getState().set({ name: 'Bike Crew', kind: 'interest', stampColor: 'sky' });
    useNewCrew.getState().reset();
    const s = useNewCrew.getState();
    expect([s.name, s.kind, s.stampColor]).toEqual(['', 'city', 'tangerine']);
  });
});

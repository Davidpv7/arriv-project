import { create } from 'zustand';

import type { StampColor } from '@/features/feed/format';

import type { communityKinds } from './schemas';

export type CrewKind = (typeof communityKinds)[number];
export const NEW_CREW_STEPS = 5;

/** Answers for the "Start a crew" wizard, saved together on the last step. */
type NewCrewState = {
  name: string;
  kind: CrewKind;
  city: string;
  visaSubclass: string;
  language: string;
  description: string;
  stampColor: StampColor;
  set: (patch: Partial<Omit<NewCrewState, 'set' | 'reset'>>) => void;
  reset: () => void;
};

const initial = {
  name: '',
  kind: 'city' as CrewKind,
  city: '',
  visaSubclass: '',
  language: '',
  description: '',
  stampColor: 'tangerine' as StampColor,
};

export const useNewCrew = create<NewCrewState>((set) => ({
  ...initial,
  set: (patch) => set(patch),
  reset: () => set(initial),
}));

/** What each kind requires on the details step (i18n error key, or null when fine). */
export function detailsError(s: Pick<NewCrewState, 'kind' | 'city' | 'visaSubclass' | 'language'>) {
  if (s.kind === 'city' && !s.city.trim()) return 'communities.wizard.errors.city';
  if (s.kind === 'visa' && !/^\d{3}$/.test(s.visaSubclass)) return 'communities.wizard.errors.visa';
  if (s.kind === 'language' && !s.language) return 'communities.wizard.errors.language';
  return null;
}

export const nameError = (name: string) =>
  name.trim().length < 3 || name.trim().length > 40 ? 'communities.wizard.errors.name' : null;

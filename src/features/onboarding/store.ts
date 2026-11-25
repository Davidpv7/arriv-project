import { create } from 'zustand';

import type { Visibility } from '@/features/profile/schemas';

/** Answers collected across the onboarding steps, saved together at the end. */
type OnboardingState = {
  origin: string | null;
  arrivedOn: string | null;
  visaSubclass: string;
  visaLabel: string;
  visibility: Visibility;
  city: string;
  set: (patch: Partial<Omit<OnboardingState, 'set' | 'reset'>>) => void;
  reset: () => void;
};

const initial = {
  origin: null,
  arrivedOn: null,
  visaSubclass: '',
  visaLabel: '',
  visibility: 'connections' as Visibility,
  city: '',
};

export const useOnboarding = create<OnboardingState>((set) => ({
  ...initial,
  set: (patch) => set(patch),
  reset: () => set(initial),
}));

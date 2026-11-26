import { create } from 'zustand';

import { milestoneFormSchema, type MilestoneFormInput, type MilestoneKind } from './rules';

export const NEW_STAMP_STEPS = 5;

export const EMPTY_MILESTONE: MilestoneFormInput = {
  kind: 'arrival',
  title: '',
  status: 'done',
  happenedOn: null,
  dueOn: null,
  remindOn: null,
  visaSubclass: '',
  place: '',
  notes: '',
  visibility: 'private',
};

/** Answers for the "Add a stamp" wizard, saved together on the last step. */
type NewStampState = MilestoneFormInput & {
  set: (patch: Partial<MilestoneFormInput>) => void;
  reset: () => void;
};

export const useNewStamp = create<NewStampState>((set) => ({
  ...EMPTY_MILESTONE,
  set: (patch) => set(patch),
  reset: () => set(EMPTY_MILESTONE),
}));

/** Just the answers, without the store's functions. */
export function answers(s: NewStampState): MilestoneFormInput {
  return {
    kind: s.kind,
    title: s.title,
    status: s.status,
    happenedOn: s.happenedOn,
    dueOn: s.dueOn,
    remindOn: s.remindOn,
    visaSubclass: s.visaSubclass,
    place: s.place,
    notes: s.notes,
    visibility: s.visibility,
  };
}

type Field = keyof MilestoneFormInput;

/**
 * Validation for one step: the whole form is checked (rules span fields, like a
 * reminder before the due date), but only this step's fields report errors.
 * Returns field -> i18n key.
 */
export function stepErrors(
  values: MilestoneFormInput,
  fields: Field[],
): Partial<Record<Field, string>> {
  const parsed = milestoneFormSchema.safeParse(values);
  if (parsed.success) return {};
  const errors: Partial<Record<Field, string>> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as Field | undefined;
    if (field && fields.includes(field) && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

/** i18n key for a suggested title, e.g. visa + done -> "Visa granted". Null for "other". */
export function suggestionKey(kind: MilestoneKind, status: MilestoneFormInput['status']) {
  if (kind === 'other') return null;
  return `journey.wizard.suggest.${kind}.${status}` as const;
}

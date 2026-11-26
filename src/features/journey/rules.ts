/** Pure Journey rules: the milestone form, stamp faces and dates. No native modules. */

import { z } from 'zod';

import { todayIso } from '@/features/profile/places';
import { isRealDate, visibilitySchema } from '@/features/profile/schemas';
import type { Database, Tables } from '@/types/database';

export type MilestoneKind = Database['public']['Enums']['milestone_kind'];
export type MilestoneStatus = Database['public']['Enums']['milestone_status'];
export type Milestone = Tables<'milestones'>;

export const MILESTONE_KINDS: MilestoneKind[] = [
  'visa',
  'arrival',
  'education',
  'work',
  'home',
  'pr',
  'citizenship',
  'other',
];

/** Kinds where a visa subclass makes sense on the stamp. */
export const SUBCLASS_KINDS: MilestoneKind[] = ['visa', 'pr'];

export const TITLE_MAX = 80;
/** A place on a stamp is a short code, like an airport: SYD, MEL, NSW. */
export const PLACE_MAX = 4;
export const NOTES_MAX = 2000;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'journey.errors.date')
  .refine(isRealDate, 'journey.errors.date')
  .refine((v) => v >= '1950-01-01' && v <= '2100-12-31', 'journey.errors.date');

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'journey.errors.tooLong')
    .transform((v) => (v === '' ? null : v));

// Error strings are i18n keys; screens translate them.
export const milestoneFormSchema = z
  .object({
    kind: z.enum(MILESTONE_KINDS as [MilestoneKind, ...MilestoneKind[]]),
    title: z
      .string()
      .trim()
      .min(1, 'journey.errors.titleRequired')
      .max(TITLE_MAX, 'journey.errors.tooLong'),
    status: z.enum(['done', 'upcoming']),
    happenedOn: isoDate.nullable(),
    dueOn: isoDate.nullable(),
    remindOn: isoDate.nullable(),
    visaSubclass: z
      .string()
      .trim()
      .regex(/^(\d{3})?$/, 'journey.errors.subclass')
      .transform((v) => (v === '' ? null : v)),
    place: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{0,4}$/, 'journey.errors.place')
      .transform((v) => (v === '' ? null : v)),
    notes: optionalText(NOTES_MAX),
    visibility: visibilitySchema,
  })
  .superRefine((v, ctx) => {
    const today = todayIso();
    if (v.status === 'done') {
      if (!v.happenedOn) {
        ctx.addIssue({
          code: 'custom',
          path: ['happenedOn'],
          message: 'journey.errors.dateRequired',
        });
      } else if (v.happenedOn > today) {
        ctx.addIssue({
          code: 'custom',
          path: ['happenedOn'],
          message: 'journey.errors.dateFuture',
        });
      }
      return;
    }
    if (!v.dueOn) {
      ctx.addIssue({ code: 'custom', path: ['dueOn'], message: 'journey.errors.dateRequired' });
      return;
    }
    if (v.remindOn) {
      if (v.remindOn > v.dueOn) {
        ctx.addIssue({
          code: 'custom',
          path: ['remindOn'],
          message: 'journey.errors.remindAfterDue',
        });
      } else if (v.remindOn < today) {
        ctx.addIssue({ code: 'custom', path: ['remindOn'], message: 'journey.errors.remindPast' });
      }
    }
  });

export type MilestoneFormInput = z.input<typeof milestoneFormSchema>;
export type MilestoneFormValues = z.output<typeof milestoneFormSchema>;

/** The row to save: fields that don't apply to the status are cleared. */
export function toMilestoneRow(v: MilestoneFormValues) {
  const done = v.status === 'done';
  return {
    kind: v.kind,
    title: v.title,
    status: v.status,
    happened_on: done ? v.happenedOn : null,
    due_on: done ? null : v.dueOn,
    remind_on: done ? null : v.remindOn,
    visa_subclass: SUBCLASS_KINDS.includes(v.kind) ? v.visaSubclass : null,
    place: v.place,
    notes: v.notes,
    visibility: v.visibility,
  };
}

/** Form values for editing an existing milestone. */
export function toFormInput(m: Milestone): MilestoneFormInput {
  return {
    kind: m.kind,
    title: m.title,
    status: m.status,
    happenedOn: m.happened_on,
    dueOn: m.due_on,
    remindOn: m.remind_on,
    visaSubclass: m.visa_subclass ?? '',
    place: m.place ?? '',
    notes: m.notes ?? '',
    visibility: m.visibility,
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-03-14" -> "14 Mar 2026". */
export function formatDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}

/** Whole days from today until the date (negative when past). */
export function daysUntil(iso: string, today = todayIso()): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(iso) - toUtc(today)) / 86_400_000);
}

/** Done stamps newest first; upcoming soonest first. */
export function splitJourney<
  T extends Pick<Milestone, 'status' | 'happened_on' | 'due_on' | 'created_at'>,
>(items: T[]): { done: T[]; upcoming: T[] } {
  const done = items
    .filter((m) => m.status === 'done')
    .sort(
      (a, b) =>
        (b.happened_on ?? '').localeCompare(a.happened_on ?? '') ||
        b.created_at.localeCompare(a.created_at),
    );
  const upcoming = items
    .filter((m) => m.status === 'upcoming')
    .sort((a, b) => (a.due_on ?? '').localeCompare(b.due_on ?? ''));
  return { done, upcoming };
}

/** Postmark ink: rust for visa-type stamps, teal for everything else. */
export const stampInk = (kind: MilestoneKind): 'rust' | 'teal' =>
  kind === 'visa' || kind === 'pr' || kind === 'citizenship' ? 'rust' : 'teal';

/** The stamp's face as postmark lines. `kindLabel` and the date are already uppercase-ready. */
export type StampFace = Pick<Milestone, 'kind' | 'happened_on' | 'visa_subclass' | 'place'>;

export function stampLines(face: StampFace, kindLabel: string) {
  const middle = face.visa_subclass ?? face.place ?? null;
  return [
    { text: kindLabel.toUpperCase(), style: 'mono' as const },
    ...(middle ? [{ text: middle.toUpperCase(), style: 'big' as const }] : []),
    // Month and year fit inside the ring at every size; the full date is on the detail.
    ...(face.happened_on
      ? [
          {
            text: formatDay(face.happened_on).replace(/^\d+ /, '').toUpperCase(),
            style: 'mono' as const,
          },
        ]
      : []),
  ];
}

/** A stamp as shown to others: the face plus its title. */
export type StampWithTitle = StampFace & { title: string };

/** The stamp a journey-update post carries (filled by the database), or null. */
export function parseStamp(json: unknown): StampWithTitle | null {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return null;
  const s = json as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v ? v : null);
  const kind = str(s.kind);
  const title = str(s.title);
  if (!kind || !title || !(MILESTONE_KINDS as string[]).includes(kind)) return null;
  return {
    kind: kind as MilestoneKind,
    title,
    happened_on: str(s.happened_on),
    visa_subclass: str(s.visa_subclass),
    place: str(s.place),
  };
}

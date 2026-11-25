import { z } from 'zod';

import { todayIso } from './places';

// Error strings are i18n keys; screens translate them.
export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, 'profile.errors.handle');

/** True when YYYY-MM-DD names a day that exists (no 30 February). */
function isRealDate(v: string): boolean {
  const [y, m, d] = v.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export const arrivalSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'profile.errors.date')
  .refine(isRealDate, 'profile.errors.date')
  .refine((v) => v >= '1950-01-01', 'profile.errors.date')
  .refine((v) => v <= todayIso(), 'profile.errors.dateFuture');

export const visibilitySchema = z.enum(['public', 'connections', 'private']);

export const visaSchema = z.object({
  subclass: z
    .string()
    .trim()
    .regex(/^(\d{3})?$/, 'profile.errors.subclass'),
  label: z.string().trim().max(60, 'profile.errors.tooLong'),
  visibility: visibilitySchema,
});

export const profileFormSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'profile.errors.nameRequired')
    .max(50, 'profile.errors.tooLong'),
  handle: handleSchema,
  bio: z.string().trim().max(300, 'profile.errors.bioTooLong'),
  origin: z
    .string()
    .regex(/^[A-Z]{2}$/, 'profile.errors.origin')
    .nullable(),
  city: z.string().trim().max(60, 'profile.errors.tooLong'),
  arrivedOn: arrivalSchema.nullable(),
  visa: visaSchema,
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
export type Visibility = z.infer<typeof visibilitySchema>;

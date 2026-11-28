/** Pure visa stats helpers: read what get_visa_stats() returns. No native modules. */

import { z } from 'zod';

import { formatDay } from '@/features/journey/rules';
import type { Json } from '@/types/database';

const count = z.number().int().nonnegative().nullable();

// Any figure from fewer than 5 people comes back as null (the database decides).
const visaStatsSchema = z.object({
  subclass: z.string(),
  min_group: z.number().int(),
  waiting: count,
  granted_7d: count,
  granted_30d: count,
  wait_days: z
    .object({
      people: z.number().int(),
      p25: z.number(),
      median: z.number(),
      p75: z.number(),
    })
    .nullable(),
  weekly_grants: z.array(z.number().int().nonnegative()).nullable(),
  waiting_by_month: z.array(z.object({ month: z.string(), people: z.number().int() })),
});

export type VisaStats = z.infer<typeof visaStatsSchema>;

/** The RPC's JSON as typed stats, or null for an invalid subclass or an unexpected shape. */
export function parseVisaStats(json: Json | null): VisaStats | null {
  const parsed = visaStatsSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** True when nothing can be shown yet (every figure is under the minimum group). */
export function isEmptyStats(s: VisaStats): boolean {
  return (
    s.waiting == null &&
    s.granted_7d == null &&
    s.granted_30d == null &&
    s.wait_days == null &&
    s.weekly_grants == null &&
    s.waiting_by_month.length === 0
  );
}

/** "2026-03" -> "Mar 2026". */
export const formatMonth = (month: string) => formatDay(`${month}-01`).replace(/^\d+ /, '');

/** A 3-digit subclass, or null. */
export const cleanSubclass = (v: string | null | undefined) => {
  const s = (v ?? '').trim();
  return /^\d{3}$/.test(s) ? s : null;
};

/** Where Home Affairs publishes official processing times. */
export const OFFICIAL_PROCESSING_TIMES_URL =
  'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-processing-times/global-visa-processing-times';

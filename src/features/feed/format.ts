import type { TFunction } from 'i18next';

import { CITIES } from '@/features/profile/places';

/** "Now", "5m", "3h", "2d", then "14 Mar" (and the year if not this year). */
export function relativeTime(t: TFunction, iso: string, now = new Date()): string {
  const then = new Date(iso);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return t('time.now');
  if (minutes < 60) return t('time.minutes', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('time.hours', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('time.days', { count: days });
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const label = `${then.getDate()} ${months[then.getMonth()]}`;
  return then.getFullYear() === now.getFullYear() ? label : `${label} ${then.getFullYear()}`;
}

/** Two letters for a community stamp: "Sydney Newcomers" → "SN". */
export function communityInitials(name: string): string {
  const words = name.split(/\s+/).filter((w) => /[A-Za-zÀ-ÿ0-9]/.test(w));
  const big = words.filter((w) => w.length > 2 || /^\d+$/.test(w));
  const pick = big.length >= 2 ? big : words;
  const letters = pick.length >= 2 ? pick[0][0] + pick[1][0] : (pick[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

/** Departures board gate: airport code for a known city, "AU" when Australia-wide. */
export function gateCode(city: string | null | undefined): string {
  if (!city) return 'AU';
  const known = CITIES.find((c) => c.name.toLowerCase() === city.trim().toLowerCase());
  return known?.code ?? city.trim().slice(0, 3).toUpperCase();
}

export type StampColor = 'tangerine' | 'sunshine' | 'sky' | 'card';
export const STAMP_COLORS: StampColor[] = ['tangerine', 'sunshine', 'sky', 'card'];
export const asStampColor = (c: string | null | undefined): StampColor =>
  STAMP_COLORS.includes(c as StampColor) ? (c as StampColor) : 'tangerine';

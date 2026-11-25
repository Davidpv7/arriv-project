import type { ProfileWithVisa } from './api';
import { cityCode, dayCount, findCountry } from './places';

/** "AC" from "Ana Costa". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "MAR 2025" from "2025-03-14". Fixed 3-letter months so every platform matches. */
export function monthYear(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const [y, m] = iso.split('-').map(Number);
  const month = MONTHS[m - 1];
  return y && month ? `${month} ${y}` : null;
}

/** Text for a visa the viewer is allowed to see, e.g. "500" or "Student visa". */
export function visaText(visa: ProfileWithVisa['visa']): string | null {
  if (!visa) return null;
  return visa.visa_subclass || visa.visa_label || null;
}

/** Everything the boarding pass needs from a profile. */
export function boardingPass(profile: ProfileWithVisa) {
  return {
    from: findCountry(profile.origin_country)?.alpha3 ?? '???',
    fromName: findCountry(profile.origin_country)?.name,
    to: cityCode(profile.city),
    toName: profile.city ?? undefined,
    visa: visaText(profile.visa),
    day: dayCount(profile.arrived_on),
  };
}

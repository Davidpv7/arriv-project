import { COUNTRIES, type Country } from '../onboarding/countries';

/** Australian cities offered in onboarding, with their airport code for the boarding pass. */
export const CITIES = [
  { name: 'Sydney', code: 'SYD' },
  { name: 'Melbourne', code: 'MEL' },
  { name: 'Brisbane', code: 'BNE' },
  { name: 'Perth', code: 'PER' },
  { name: 'Adelaide', code: 'ADL' },
  { name: 'Gold Coast', code: 'OOL' },
  { name: 'Canberra', code: 'CBR' },
  { name: 'Hobart', code: 'HBA' },
  { name: 'Darwin', code: 'DRW' },
  { name: 'Newcastle', code: 'NTL' },
  { name: 'Cairns', code: 'CNS' },
  { name: 'Townsville', code: 'TSV' },
] as const;

/** Boarding pass code for a city; Australia-wide "AUS" when unknown. */
export function cityCode(city: string | null | undefined): string {
  const match = CITIES.find((c) => c.name.toLowerCase() === city?.trim().toLowerCase());
  return match?.code ?? 'AUS';
}

const byAlpha2 = new Map(COUNTRIES.map((c) => [c.alpha2, c]));

export function findCountry(alpha2: string | null | undefined): Country | undefined {
  return alpha2 ? byAlpha2.get(alpha2.toUpperCase()) : undefined;
}

/** Search countries by name or code. Exact code matches first. */
export function searchCountries(query: string, limit = 8): Country[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const exact = COUNTRIES.filter(
    (c) => c.alpha2.toLowerCase() === q || c.alpha3.toLowerCase() === q,
  );
  const starts = COUNTRIES.filter((c) => c.name.toLowerCase().startsWith(q));
  const contains = COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
  return [...new Set([...exact, ...starts, ...contains])].slice(0, limit);
}

/** "Day 412": the arrival day is day 1. Null before arrival or when unknown. */
export function dayCount(arrivedOn: string | null | undefined, today = new Date()): number | null {
  if (!arrivedOn) return null;
  const [y, m, d] = arrivedOn.split('-').map(Number);
  const start = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.floor((now - start) / 86_400_000) + 1;
  return days >= 1 ? days : null;
}

/** Today as YYYY-MM-DD in the device's time zone. */
export function todayIso(today = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

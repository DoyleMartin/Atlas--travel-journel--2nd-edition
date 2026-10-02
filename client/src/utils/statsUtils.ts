import { countriesByCode, UN_COUNTRY_TOTAL } from '../data/countries';
import type { CountryStatus, VisitedCountry } from '../types/api';

export interface MapStats {
  /** UN members + observers marked visited or lived */
  countries: number;
  /** Continents with at least one visited/lived place (territories included) */
  continents: number;
  /** countries / 195 × 100 */
  percent: number;
  /** Every marked place by status, territories included */
  byStatus: Record<CountryStatus, number>;
}

const BEEN: ReadonlySet<CountryStatus> = new Set(['visited', 'lived']);

export function computeStats(visited: readonly VisitedCountry[]): MapStats {
  const byStatus: Record<CountryStatus, number> = { visited: 0, lived: 0, want: 0 };
  const continents = new Set<string>();
  let countries = 0;

  for (const { code, status } of visited) {
    byStatus[status] += 1;
    if (!BEEN.has(status)) continue;
    const country = countriesByCode.get(code);
    if (!country) continue;
    continents.add(country.continent);
    if (country.isUN) countries += 1;
  }

  return { countries, continents: continents.size, percent: (countries / UN_COUNTRY_TOTAL) * 100, byStatus };
}

/** "0%", "0.5%", "12%" — one decimal only while it's small enough to matter. */
export function formatPercent(percent: number): string {
  if (percent === 0) return '0%';
  if (percent < 10) return `${percent.toFixed(1).replace(/\.0$/, '')}%`;
  return `${Math.round(percent)}%`;
}

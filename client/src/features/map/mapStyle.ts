import type { PathOptions } from 'leaflet';
import type { CountryStatus } from '../../types/api';

// Leaflet paints SVG attributes, not CSS classes, so colors are read from the CSS variables once
interface Palette {
  visited: string;
  lived: string;
  want: string;
  land: string;
  border: string;
  hover: string;
  markerRing: string;
}

let palette: Palette | null = null;

function getPalette(): Palette {
  if (palette) return palette;
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  palette = {
    visited: v('--color-visited'),
    lived: v('--color-lived'),
    want: v('--color-want'),
    land: v('--color-land'),
    border: v('--color-land-border'),
    hover: v('--color-primary'),
    markerRing: v('--color-border-strong'),
  };
  return palette;
}

export function statusColor(status: CountryStatus | undefined): string {
  const p = getPalette();
  return status ? p[status] : p.land;
}

export function countryStyle(status: CountryStatus | undefined): PathOptions {
  return {
    fillColor: statusColor(status),
    fillOpacity: 1,
    color: getPalette().border,
    weight: 0.6,
    opacity: 1,
  };
}

export function countryHoverStyle(): PathOptions {
  return { color: getPalette().hover, weight: 1.75 };
}

export function microstateStyle(status: CountryStatus | undefined): PathOptions {
  const p = getPalette();
  // Unmarked: reads as a speck of land; marked: solid status color with a white ring
  return {
    fillColor: status ? p[status] : p.land,
    fillOpacity: 1,
    color: status ? '#ffffff' : p.markerRing,
    weight: status ? 1.5 : 1,
    opacity: 1,
  };
}

/** True on mouse/trackpad devices — hover tooltips are skipped on touch screens. */
export const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

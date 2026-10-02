import { useCallback, useEffect, useState } from 'react';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

export interface CountryFeatureProps {
  code: string;
  name: string;
}

export type CountriesGeoJson = FeatureCollection<Polygon | MultiPolygon, CountryFeatureProps>;

// Fetched once per page load and shared by every map (main map, trip mini-maps, profiles)
let cached: Promise<CountriesGeoJson> | null = null;

function loadCountries(): Promise<CountriesGeoJson> {
  cached ??= fetch('/geojson/countries.geojson')
    .then((res) => {
      if (!res.ok) throw new Error(`Map data failed to load (${res.status})`);
      return res.json() as Promise<CountriesGeoJson>;
    })
    .catch((err: unknown) => {
      cached = null; // allow retry
      throw err;
    });
  return cached;
}

export function useCountriesGeoJson() {
  const [data, setData] = useState<CountriesGeoJson | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setError(false);
    loadCountries()
      .then((geojson) => active && setData(geojson))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { data, error, retry };
}

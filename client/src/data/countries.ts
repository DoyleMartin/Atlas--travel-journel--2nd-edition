// TODO (1e): generate from countries.geojson
export interface Country {
  code: string; // ADM0_A3
  name: string;
  continent: string;
  isUN: boolean;
}

export const countries: Country[] = [];

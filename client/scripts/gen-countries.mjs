// Builds client/public/geojson/countries.geojson and client + server src/data/countries.ts
// from Natural Earth 50m admin-0 countries.   Run from /client:  npm run gen:countries
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(here, '../..');
const CACHE = path.join(here, '.cache');
const SOURCE_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';

fs.mkdirSync(CACHE, { recursive: true });
const sourceFile = path.join(CACHE, 'ne_50m_admin_0_countries.geojson');
if (!fs.existsSync(sourceFile)) {
  console.log('Downloading Natural Earth 50m countries…');
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  fs.writeFileSync(sourceFile, await res.text());
}
const src = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

// 193 UN member states (ISO 3166-1 alpha-3) + the two observer states
const UN_MEMBERS = `AFG ALB DZA AND AGO ATG ARG ARM AUS AUT AZE BHS BHR BGD BRB BLR BEL BLZ BEN BTN BOL BIH BWA BRA BRN BGR
BFA BDI CPV KHM CMR CAN CAF TCD CHL CHN COL COM COG CRI CIV HRV CUB CYP CZE PRK COD DNK DJI DMA DOM ECU EGY SLV GNQ ERI EST
SWZ ETH FJI FIN FRA GAB GMB GEO DEU GHA GRC GRD GTM GIN GNB GUY HTI HND HUN ISL IND IDN IRN IRQ IRL ISR ITA JAM JPN JOR KAZ
KEN KIR KWT KGZ LAO LVA LBN LSO LBR LBY LIE LTU LUX MDG MWI MYS MDV MLI MLT MHL MRT MUS MEX FSM MDA MCO MNG MNE MAR MOZ MMR
NAM NRU NPL NLD NZL NIC NER NGA MKD NOR OMN PAK PLW PAN PNG PRY PER PHL POL PRT QAT KOR ROU RUS RWA KNA LCA VCT WSM SMR STP
SAU SEN SRB SYC SLE SGP SVK SVN SLB SOM ZAF SSD ESP LKA SDN SUR SWE CHE SYR TJK THA TLS TGO TON TTO TUN TUR TKM TUV UGA UKR
ARE GBR TZA USA URY UZB VUT VEN VNM YEM ZMB ZWE`.split(/\s+/);
const OBSERVERS = ['VAT', 'PSE'];
if (new Set(UN_MEMBERS).size !== 193) throw new Error(`UN list has ${new Set(UN_MEMBERS).size}, expected 193`);
const UN = new Set([...UN_MEMBERS, ...OBSERVERS]);

const NAME_OVERRIDES = {
  CIV: "Côte d'Ivoire",
  CZE: 'Czechia',
  TLS: 'Timor-Leste',
  USA: 'United States',
  COD: 'DR Congo',
  SWZ: 'Eswatini',
  VAT: 'Vatican City',
};

// Below this area a polygon is hard to tap at world zoom, so it also gets a circle marker
const SMALL_AREA_KM2 = 2500;

function continentOf(p) {
  if (!p.CONTINENT.startsWith('Seven seas')) return p.CONTINENT;
  if (p.REGION_UN === 'Americas') return p.SUBREGION === 'South America' ? 'South America' : 'North America';
  return p.REGION_UN;
}

// Spherical polygon area (km²) — same formula d3-geo uses
const R = 6371.0088;
const rad = (d) => (d * Math.PI) / 180;
function ringArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [l1, p1] = ring[i], [l2, p2] = ring[i + 1];
    sum += rad(l2 - l1) * (2 + Math.sin(rad(p1)) + Math.sin(rad(p2)));
  }
  return Math.abs((sum * R * R) / 2);
}
function areaKm2(geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  return polys.reduce((a, poly) => a + ringArea(poly[0]) - poly.slice(1).reduce((h, r) => h + ringArea(r), 0), 0);
}

const features = src.features.filter((f) => f.properties.ADM0_A3 !== 'ATA');
const countries = features
  .map((f) => {
    const p = f.properties;
    const code = p.ADM0_A3;
    const iso3 = p.ISO_A3_EH !== '-99' ? p.ISO_A3_EH : null;
    const area = areaKm2(f.geometry);
    return {
      code,
      name: NAME_OVERRIDES[code] ?? p.NAME_EN ?? p.NAME,
      continent: continentOf(p),
      iso2: p.ISO_A2_EH !== '-99' ? p.ISO_A2_EH : null,
      // Dependencies can share their sovereign's ISO code (e.g. Ashmore Is. → AUS), so exclude them
      isUN: iso3 !== null && UN.has(iso3) && p.TYPE !== 'Dependency',
      label: [Math.round(p.LABEL_Y * 1000) / 1000, Math.round(p.LABEL_X * 1000) / 1000],
      small: area < SMALL_AREA_KM2,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

// Sanity checks
const unFound = countries.filter((c) => c.isUN);
const missing = [...UN].filter((iso) => !features.some((f) => f.properties.ISO_A3_EH === iso));
const dupes = Object.entries(Object.groupBy(unFound, (c) => c.code)).filter(([, v]) => v.length > 1);
console.log(`features: ${features.length}, UN/observer matched: ${unFound.length}/195, small: ${countries.filter((c) => c.small).length}`);
if (missing.length) console.log('UN codes with no feature:', missing.join(' '));
if (dupes.length) console.log('duplicate codes:', dupes.map(([k]) => k).join(' '));
console.log('continents:', [...new Set(countries.map((c) => c.continent))].join(', '));
console.log('small:', countries.filter((c) => c.small).map((c) => c.code).join(' '));

// countries.ts (client + server)
const ts = `// GENERATED from Natural Earth 50m admin-0 countries — do not edit by hand.
// Regenerate with: cd client && npm run gen:countries

export interface Country {
  /** Natural Earth ADM0_A3 — the app's country id */
  code: string;
  name: string;
  continent: Continent;
  /** ISO 3166-1 alpha-2, for matching geocoder results (null for a few disputed areas) */
  iso2: string | null;
  /** One of the 193 UN members + 2 observers — the "% of world" denominator */
  isUN: boolean;
  /** [lat, lng] label point — used for markers and map fly-to */
  label: [number, number];
  /** Too small to tap at world zoom; rendered with an extra circle marker */
  small: boolean;
}

export const CONTINENTS = ${JSON.stringify([...new Set(countries.map((c) => c.continent))].sort())} as const;
export type Continent = (typeof CONTINENTS)[number];

export const UN_COUNTRY_TOTAL = ${unFound.length};

export const countries: Country[] = [
${countries.map((c) => `  ${JSON.stringify(c)},`).join('\n')}
];

export const countriesByCode: ReadonlyMap<string, Country> = new Map(countries.map((c) => [c.code, c]));
`;
fs.writeFileSync(path.join(PROJECT, 'client/src/data/countries.ts'), ts);
fs.writeFileSync(path.join(PROJECT, 'server/src/data/countries.ts'), ts);

// Simplified GeoJSON: only { code, name }
const tmpIn = path.join(CACHE, 'filtered.geojson');
fs.writeFileSync(tmpIn, JSON.stringify({ type: 'FeatureCollection', features: features.map((f) => ({ type: 'Feature', properties: { code: f.properties.ADM0_A3, name: countries.find((c) => c.code === f.properties.ADM0_A3).name }, geometry: f.geometry })) }));
const out = path.join(PROJECT, 'client/public/geojson/countries.geojson');
const mapshaperBin = createRequire(import.meta.url).resolve('mapshaper/bin/mapshaper');
execFileSync(process.execPath, [mapshaperBin, tmpIn, '-simplify', process.env.SIMPLIFY ?? '35%', 'keep-shapes', 'planar', '-o', out, 'precision=0.001', 'format=geojson'], { stdio: 'inherit' });
console.log(`geojson: ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);

import { CircleMarker, Tooltip } from 'react-leaflet';
import type { LatLng, LeafletMouseEvent, Path } from 'leaflet';
import { countries } from '../../../data/countries';
import type { CountryStatus } from '../../../types/api';
import { canHover, microstateStyle } from '../mapStyle';
import './MicrostateMarkers.css';

interface MicrostateMarkersProps {
  statusByCode: ReadonlyMap<string, CountryStatus>;
  onCountryClick: (code: string, latlng: LatLng) => void;
}

// Countries only — small territories (Guam, Aruba…) stay tappable as shapes once zoomed in, without cluttering the ocean
const smallCountries = countries.filter((c) => c.small && c.isUN);

/** A tappable dot on each country too small to hit at world zoom (Singapore, Malta, Monaco…). */
export default function MicrostateMarkers({ statusByCode, onCountryClick }: MicrostateMarkersProps) {
  return (
    <>
      {smallCountries.map((country) => (
        <CircleMarker
          key={country.code}
          center={country.label}
          radius={4}
          pathOptions={microstateStyle(statusByCode.get(country.code))}
          bubblingMouseEvents={false}
          eventHandlers={{
            click: (e: LeafletMouseEvent) => onCountryClick(country.code, e.latlng),
            add: (e) => (e.target as Path).getElement()?.setAttribute('data-country', country.code),
          }}
        >
          {canHover && (
            <Tooltip direction="top" offset={[0, -6]} className="country-tooltip">
              {country.name}
            </Tooltip>
          )}
        </CircleMarker>
      ))}
    </>
  );
}

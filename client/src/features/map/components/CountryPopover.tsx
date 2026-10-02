import { Popup } from 'react-leaflet';
import type { LatLng } from 'leaflet';
import { countriesByCode } from '../../../data/countries';
import type { CountryStatus } from '../../../types/api';
import './CountryPopover.css';

interface CountryPopoverProps {
  code: string;
  latlng: LatLng;
  status: CountryStatus;
  onStatusChange: (status: CountryStatus) => void;
  onRemove: () => void;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: CountryStatus; label: string }[] = [
  { value: 'visited', label: 'Visited' },
  { value: 'lived', label: 'Lived' },
  { value: 'want', label: 'Want to go' },
];

/** Shown when tapping a country that's already on the map: change status or remove. */
export default function CountryPopover({ code, latlng, status, onStatusChange, onRemove, onClose }: CountryPopoverProps) {
  const country = countriesByCode.get(code);

  return (
    <Popup
      position={latlng}
      closeButton={false}
      className="country-popover"
      autoPanPadding={[24, 24]}
      eventHandlers={{ remove: onClose }}
    >
      <div className="country-popover__header">
        <span className="country-popover__name">{country?.name ?? code}</span>
        {country && <span className="country-popover__continent">{country.continent}</span>}
      </div>

      <div className="country-popover__statuses" role="radiogroup" aria-label="Status">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={status === option.value}
            className={`country-popover__status country-popover__status--${option.value}`}
            onClick={() => onStatusChange(option.value)}
          >
            <span className="country-popover__dot" aria-hidden="true" />
            {option.label}
          </button>
        ))}
      </div>

      <button type="button" className="country-popover__remove" onClick={onRemove}>
        Remove from map
      </button>
    </Popup>
  );
}

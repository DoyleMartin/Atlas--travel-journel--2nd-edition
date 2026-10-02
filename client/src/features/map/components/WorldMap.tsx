import { useCallback, useEffect, useState } from 'react';
import { MapContainer, ZoomControl, useMap as useLeafletMap } from 'react-leaflet';
import type { LatLng, LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { countriesByCode } from '../../../data/countries';
import { useMap } from '../../../hooks/useMap';
import { useToast } from '../../../hooks/useToast';
import type { CountryStatus } from '../../../types/api';
import type { CountriesGeoJson } from '../useCountriesGeoJson';
import CountryLayer from './CountryLayer';
import CountryPopover from './CountryPopover';
import MicrostateMarkers from './MicrostateMarkers';
import './WorldMap.css';

// Antarctica is excluded, so the map stops above the Southern Ocean
const WORLD_BOUNDS: LatLngBoundsExpression = [
  [-58, -180],
  [84, 180],
];
const PAN_LIMITS: LatLngBoundsExpression = [
  [-75, -220],
  [88, 220],
];

// Latitudes worth filling the screen with on a tall (phone) screen
const LAND_LATITUDES: LatLngBoundsExpression = [
  [-45, 10],
  [72, 11],
];
const MAX_EXTRA_ZOOM = 1.5;

/**
 * Minimum zoom = whole world fits. Initial view = whole world, except on portrait screens
 * (phones) where it zooms in to fill the height instead of leaving empty ocean above and below.
 */
function FitWorld() {
  const map = useLeafletMap();

  useEffect(() => {
    const fit = () => {
      map.setMinZoom(0); // getBoundsZoom is clamped to minZoom, so measure unclamped
      const worldZoom = map.getBoundsZoom(WORLD_BOUNDS, false);
      const fillHeightZoom = map.getBoundsZoom(LAND_LATITUDES, false);
      map.setMinZoom(worldZoom);
      const { x: width, y: height } = map.getSize();
      const zoom = height > width ? Math.min(Math.max(worldZoom, fillHeightZoom), worldZoom + MAX_EXTRA_ZOOM) : worldZoom;
      map.setView([20, 12], zoom, { animate: false });
    };
    fit();
    map.attributionControl.addAttribution('Boundaries: Natural Earth');
    map.on('resize', fit);
    return () => {
      map.off('resize', fit);
    };
  }, [map]);

  return null;
}

const nameOf = (code: string) => countriesByCode.get(code)?.name ?? code;

interface WorldMapProps {
  geojson: CountriesGeoJson | null;
}

interface Selection {
  code: string;
  latlng: LatLng;
}

export default function WorldMap({ geojson }: WorldMapProps) {
  const { statusByCode, setCountryStatus, removeCountry } = useMap();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<Selection | null>(null);

  const handleCountryClick = useCallback(
    (code: string, latlng: LatLng) => {
      if (statusByCode.has(code)) {
        setSelected({ code, latlng });
        return;
      }
      // One tap to add — no confirmation, just an undo
      setSelected(null);
      void setCountryStatus(code, 'visited');
      showToast({ message: `Added ${nameOf(code)}`, action: { label: 'Undo', onClick: () => void removeCountry(code) } });
    },
    [statusByCode, setCountryStatus, removeCountry, showToast],
  );

  const handleStatusChange = (code: string, status: CountryStatus) => void setCountryStatus(code, status);

  const handleRemove = (code: string) => {
    const previous = statusByCode.get(code);
    setSelected(null);
    void removeCountry(code);
    if (previous) {
      showToast({
        message: `Removed ${nameOf(code)}`,
        action: { label: 'Undo', onClick: () => void setCountryStatus(code, previous) },
      });
    }
  };

  const selectedStatus = selected ? statusByCode.get(selected.code) : undefined;

  return (
    <MapContainer
      className="world-map"
      center={[20, 10]}
      zoom={2}
      maxZoom={8}
      zoomSnap={0.25}
      zoomDelta={0.5}
      wheelPxPerZoomLevel={90}
      maxBounds={PAN_LIMITS}
      maxBoundsViscosity={1}
      zoomControl={false}
      worldCopyJump={false}
    >
      <FitWorld />
      <ZoomControl position="bottomright" />

      {geojson && <CountryLayer data={geojson} statusByCode={statusByCode} onCountryClick={handleCountryClick} />}
      {geojson && <MicrostateMarkers statusByCode={statusByCode} onCountryClick={handleCountryClick} />}

      {selected && selectedStatus && (
        <CountryPopover
          // New key per tap so tapping the same country again reopens the popup
          key={`${selected.code}:${selected.latlng.lat}:${selected.latlng.lng}`}
          code={selected.code}
          latlng={selected.latlng}
          status={selectedStatus}
          onStatusChange={(status) => handleStatusChange(selected.code, status)}
          onRemove={() => handleRemove(selected.code)}
          onClose={() => setSelected((s) => (s?.code === selected.code ? null : s))}
        />
      )}
    </MapContainer>
  );
}

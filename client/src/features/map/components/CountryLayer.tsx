import { useCallback, useEffect, useRef } from 'react';
import { GeoJSON } from 'react-leaflet';
import type { Feature, Geometry } from 'geojson';
import type { GeoJSON as LeafletGeoJSON, LatLng, Layer, LeafletMouseEvent, Path } from 'leaflet';
import type { CountryStatus } from '../../../types/api';
import { canHover, countryHoverStyle, countryStyle } from '../mapStyle';
import type { CountriesGeoJson, CountryFeatureProps } from '../useCountriesGeoJson';
import './CountryLayer.css';

interface CountryLayerProps {
  data: CountriesGeoJson;
  statusByCode: ReadonlyMap<string, CountryStatus>;
  onCountryClick: (code: string, latlng: LatLng) => void;
}

type CountryFeature = Feature<Geometry, CountryFeatureProps>;

/** All country polygons, colored by status. */
export default function CountryLayer({ data, statusByCode, onCountryClick }: CountryLayerProps) {
  const layerRef = useRef<LeafletGeoJSON>(null);

  // Leaflet binds handlers once per feature, so they read the latest props through refs
  const statusRef = useRef(statusByCode);
  const clickRef = useRef(onCountryClick);
  useEffect(() => {
    statusRef.current = statusByCode;
    clickRef.current = onCountryClick;
  });

  const style = useCallback(
    (feature?: CountryFeature) => countryStyle(feature ? statusRef.current.get(feature.properties.code) : undefined),
    [],
  );

  // Recolor in place when statuses change (react-leaflet doesn't restyle on prop changes)
  useEffect(() => {
    layerRef.current?.setStyle(style);
  }, [statusByCode, style]);

  const onEachFeature = useCallback((feature: CountryFeature, layer: Layer) => {
    const { code, name } = feature.properties;
    layer.on({
      click: (e: LeafletMouseEvent) => clickRef.current(code, e.latlng),
      mouseover: () => {
        (layer as Path).setStyle(countryHoverStyle());
        (layer as Path).bringToFront();
      },
      mouseout: () => layerRef.current?.resetStyle(layer),
      // Tag the SVG path with its country code (handy in DevTools and for browser tests)
      add: () => (layer as Path).getElement()?.setAttribute('data-country', code),
    });
    if (canHover) {
      layer.bindTooltip(name, { sticky: true, direction: 'top', offset: [0, -10], className: 'country-tooltip' });
    }
  }, []);

  return <GeoJSON ref={layerRef} data={data} style={style} onEachFeature={onEachFeature} />;
}

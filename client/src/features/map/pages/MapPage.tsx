import Button from '../../../components/Button/Button';
import { useMap } from '../../../hooks/useMap';
import MapStatsBar from '../components/MapStatsBar';
import WorldMap from '../components/WorldMap';
import { useCountriesGeoJson } from '../useCountriesGeoJson';
import './MapPage.css';

export default function MapPage() {
  const geo = useCountriesGeoJson();
  const { loadStatus, reload } = useMap();

  const failed = geo.error || loadStatus === 'error';
  const loading = !failed && (!geo.data || loadStatus === 'loading' || loadStatus === 'idle');

  return (
    <div className="map-page">
      <WorldMap geojson={geo.data} />
      <MapStatsBar />

      {loading && (
        <div className="map-page__overlay" aria-live="polite">
          <span className="map-page__spinner" aria-hidden="true" />
          <span className="map-page__overlay-text">Loading your map…</span>
        </div>
      )}

      {failed && (
        <div className="map-page__overlay" role="alert">
          <p className="map-page__overlay-text">We couldn&rsquo;t load your map.</p>
          <Button
            variant="secondary"
            onClick={() => {
              if (geo.error) geo.retry();
              if (loadStatus === 'error') reload();
            }}
          >
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

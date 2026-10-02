import { useMemo } from 'react';
import { CONTINENTS, UN_COUNTRY_TOTAL } from '../../../data/countries';
import { useMap } from '../../../hooks/useMap';
import { computeStats, formatPercent } from '../../../utils/statsUtils';
import './MapStatsBar.css';

export default function MapStatsBar() {
  const { visitedCountries } = useMap();
  const stats = useMemo(() => computeStats(visitedCountries), [visitedCountries]);
  const isEmpty = visitedCountries.length === 0;

  return (
    <section className="map-stats" aria-label="Your travel stats">
      <dl className="map-stats__numbers">
        <div className="map-stats__stat">
          <dt className="map-stats__label">Countries</dt>
          <dd className="map-stats__value">{stats.countries}</dd>
        </div>
        <div className="map-stats__stat">
          <dt className="map-stats__label">Continents</dt>
          <dd className="map-stats__value">
            {stats.continents}
            <span className="map-stats__of">/{CONTINENTS.length}</span>
          </dd>
        </div>
        <div className="map-stats__stat">
          <dt className="map-stats__label">Of the world</dt>
          <dd className="map-stats__value">{formatPercent(stats.percent)}</dd>
        </div>
      </dl>

      <progress
        className="map-stats__progress"
        value={stats.countries}
        max={UN_COUNTRY_TOTAL}
        aria-label={`${stats.countries} of ${UN_COUNTRY_TOTAL} countries`}
      />

      {isEmpty ? (
        <p className="map-stats__hint">Tap any country to mark it visited.</p>
      ) : (
        <ul className="map-stats__legend" aria-label="Legend">
          <li className="map-stats__legend-item map-stats__legend-item--visited">Visited {stats.byStatus.visited}</li>
          <li className="map-stats__legend-item map-stats__legend-item--lived">Lived {stats.byStatus.lived}</li>
          <li className="map-stats__legend-item map-stats__legend-item--want">Want to go {stats.byStatus.want}</li>
        </ul>
      )}
    </section>
  );
}

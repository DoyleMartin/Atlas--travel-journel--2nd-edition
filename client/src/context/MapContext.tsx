import { createContext, useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { deleteCountry, fetchUserMap, saveCountry } from '../features/map/mapAPI';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { parseApiError } from '../services/api';
import type { CountryStatus, VisitedCity, VisitedCountry } from '../types/api';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface MapState {
  loadStatus: LoadStatus;
  visitedCountries: VisitedCountry[];
  visitedCities: VisitedCity[];
}

type MapAction =
  | { type: 'LOAD_START' }
  | { type: 'LOADED'; countries: VisitedCountry[]; cities: VisitedCity[] }
  | { type: 'LOAD_FAILED' }
  | { type: 'RESET' }
  | { type: 'UPSERT_COUNTRY'; country: VisitedCountry }
  | { type: 'REMOVE_COUNTRY'; code: string };

const initialState: MapState = { loadStatus: 'idle', visitedCountries: [], visitedCities: [] };

function mapReducer(state: MapState, action: MapAction): MapState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loadStatus: 'loading' };
    case 'LOADED':
      return { loadStatus: 'ready', visitedCountries: action.countries, visitedCities: action.cities };
    case 'LOAD_FAILED':
      return { ...state, loadStatus: 'error' };
    case 'RESET':
      return initialState;
    case 'UPSERT_COUNTRY': {
      const exists = state.visitedCountries.some((c) => c.code === action.country.code);
      const visitedCountries = exists
        ? state.visitedCountries.map((c) => (c.code === action.country.code ? action.country : c))
        : [...state.visitedCountries, action.country];
      return { ...state, visitedCountries };
    }
    case 'REMOVE_COUNTRY':
      return { ...state, visitedCountries: state.visitedCountries.filter((c) => c.code !== action.code) };
  }
}

export interface MapContextValue extends MapState {
  /** code → status, for coloring the map */
  statusByCode: ReadonlyMap<string, CountryStatus>;
  /** Adds the country, or changes its status if already marked. Updates instantly; rolls back if the save fails. */
  setCountryStatus: (code: string, status: CountryStatus) => Promise<void>;
  removeCountry: (code: string) => Promise<void>;
  reload: () => void;
}

export const MapContext = createContext<MapContextValue | null>(null);

export function MapProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [state, dispatch] = useReducer(mapReducer, initialState);
  const userId = user?._id;

  // Latest list for the callbacks below, so an Undo created before the change still sees it
  const countriesRef = useRef(state.visitedCountries);
  countriesRef.current = state.visitedCountries;

  const load = useCallback(
    (id: string, isActive: () => boolean = () => true) => {
      dispatch({ type: 'LOAD_START' });
      fetchUserMap(id)
        .then((map) => {
          if (isActive()) dispatch({ type: 'LOADED', countries: map.visitedCountries, cities: map.visitedCities });
        })
        .catch(() => {
          if (isActive()) dispatch({ type: 'LOAD_FAILED' });
        });
    },
    [],
  );

  // Load the logged-in user's map; clear it on logout
  useEffect(() => {
    if (!userId) {
      dispatch({ type: 'RESET' });
      return;
    }
    let active = true;
    load(userId, () => active);
    return () => {
      active = false;
    };
  }, [userId, load]);

  const reload = useCallback(() => {
    if (userId) load(userId);
  }, [userId, load]);

  const statusByCode = useMemo(
    () => new Map(state.visitedCountries.map((c) => [c.code, c.status])),
    [state.visitedCountries],
  );

  // Fast taps (add → Undo) must reach the server in order, and a slow reply must not
  // overwrite a newer change. So writes are queued per country, and each one only applies
  // its result if no newer change to that country has been made since.
  const queues = useRef(new Map<string, Promise<unknown>>());
  const latestChange = useRef(new Map<string, number>());

  const inOrder = useCallback(<T,>(code: string, task: () => Promise<T>): Promise<T> => {
    const previous = queues.current.get(code) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(task);
    queues.current.set(code, next);
    void next
      .catch(() => undefined)
      .finally(() => {
        if (queues.current.get(code) === next) queues.current.delete(code);
      });
    return next;
  }, []);

  // Leaving mid-save would cancel the request, so ask the browser to confirm while writes are pending
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (queues.current.size > 0) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const startChange = (code: string) => {
    const id = (latestChange.current.get(code) ?? 0) + 1;
    latestChange.current.set(code, id);
    return () => latestChange.current.get(code) === id;
  };

  const setCountryStatus = useCallback(
    async (code: string, status: CountryStatus) => {
      const previous = countriesRef.current.find((c) => c.code === code);
      const isLatest = startChange(code);
      dispatch({
        type: 'UPSERT_COUNTRY',
        country: { code, status, addedAt: previous?.addedAt ?? new Date().toISOString() },
      });
      try {
        const saved = await inOrder(code, () => saveCountry(code, status));
        if (isLatest()) dispatch({ type: 'UPSERT_COUNTRY', country: saved });
      } catch (err) {
        if (!isLatest()) return;
        dispatch(previous ? { type: 'UPSERT_COUNTRY', country: previous } : { type: 'REMOVE_COUNTRY', code });
        showToast({ message: `Couldn't save: ${parseApiError(err).message}`, tone: 'error' });
      }
    },
    [showToast, inOrder],
  );

  const removeCountry = useCallback(
    async (code: string) => {
      const previous = countriesRef.current.find((c) => c.code === code);
      if (!previous) return;
      const isLatest = startChange(code);
      dispatch({ type: 'REMOVE_COUNTRY', code });
      try {
        await inOrder(code, () => deleteCountry(code));
      } catch (err) {
        if (!isLatest()) return;
        dispatch({ type: 'UPSERT_COUNTRY', country: previous });
        showToast({ message: `Couldn't remove: ${parseApiError(err).message}`, tone: 'error' });
      }
    },
    [showToast, inOrder],
  );

  const value = useMemo(
    () => ({ ...state, statusByCode, setCountryStatus, removeCountry, reload }),
    [state, statusByCode, setCountryStatus, removeCountry, reload],
  );

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

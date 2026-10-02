import { useContext } from 'react';
import { MapContext, type MapContextValue } from '../context/MapContext';

export function useMap(): MapContextValue {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error('useMap must be used inside <MapProvider>');
  return ctx;
}

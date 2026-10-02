import api from '../../services/api';
import type { CountryStatus, VisitedCity, VisitedCountry } from '../../types/api';

export interface UserMap {
  userId: string;
  username: string;
  visitedCountries: VisitedCountry[];
  visitedCities: VisitedCity[];
}

export async function fetchUserMap(userId: string): Promise<UserMap> {
  const { data } = await api.get<UserMap>(`/map/${userId}`);
  return data;
}

/** Adds the country or changes its status. */
export async function saveCountry(code: string, status: CountryStatus): Promise<VisitedCountry> {
  const { data } = await api.post<{ country: VisitedCountry }>('/map/countries', { code, status });
  return data.country;
}

export async function deleteCountry(code: string): Promise<void> {
  await api.delete(`/map/countries/${code}`);
}

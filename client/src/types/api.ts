// Shapes the server sends. Keep in sync with server/src/features/*/*.model.ts (JSON form: ids and dates are strings).

export type Privacy = 'public' | 'followers' | 'private';
export type CountryStatus = 'visited' | 'lived' | 'want';

export interface Image {
  url: string;
  cloudinaryId: string;
}

export interface VisitedCountry {
  code: string; // ADM0_A3
  status: CountryStatus;
  addedAt: string;
}

export interface VisitedCity {
  _id: string;
  name: string;
  lat: number;
  lng: number;
  countryCode: string;
  addedAt: string;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: Image;
  bio: string;
  visitedCountries: VisitedCountry[];
  visitedCities: VisitedCity[];
  mapPrivacy: Privacy;
  followers: string[];
  following: string[];
  createdAt: string;
  updatedAt: string;
}

/** Every error response from the API. */
export interface ApiErrorBody {
  message: string;
  code?: string;
  details?: { path: string; message: string }[];
}

import axios from 'axios';
import type { ApiErrorBody } from '../types/api';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Set after one refresh-and-retry so a request is never retried twice. */
    _retried?: boolean;
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

// One refresh at a time: if five requests expire together, they all wait on the same refresh
let refreshing: Promise<unknown> | null = null;

let sessionLostHandler: (() => void) | null = null;

/** AuthContext registers here to hear when a refresh fails (session is over). */
export function onSessionLost(handler: (() => void) | null): void {
  sessionLostHandler = handler;
}

api.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorBody>(error) || !error.config) throw error;

  const { config, response } = error;
  const expired = response?.status === 401 && response.data?.code === 'TOKEN_EXPIRED';
  if (!expired || config._retried) throw error;

  config._retried = true;
  try {
    refreshing ??= api.post('/auth/refresh').finally(() => {
      refreshing = null;
    });
    await refreshing;
  } catch {
    // Server cleared the cookies; the retry below goes through as logged-out
    sessionLostHandler?.();
  }
  return api(config);
});

export interface ParsedApiError {
  message: string;
  code?: string;
  /** Field name → message, for showing next to form inputs. */
  fields: Record<string, string>;
}

export function parseApiError(err: unknown, fallback = 'Something went wrong. Please try again.'): ParsedApiError {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    if (!err.response) {
      return { message: "Can't reach the server. Check your connection and try again.", fields: {} };
    }
    const data = err.response.data;
    const fields = Object.fromEntries((data?.details ?? []).map((d) => [d.path, d.message]));
    return { message: data?.message ?? fallback, code: data?.code, fields };
  }
  return { message: fallback, fields: {} };
}

export default api;

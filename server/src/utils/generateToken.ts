import jwt from 'jsonwebtoken';
import type { CookieOptions, Response } from 'express';

export const ACCESS_COOKIE = 'atlas_at';
export const REFRESH_COOKIE = 'atlas_rt';

const ACCESS_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// The refresh cookie is only sent to auth routes, never to the rest of the API
const REFRESH_COOKIE_PATH = '/api/auth';

function secret(name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function signAccess(userId: string): string {
  return jwt.sign({}, secret('JWT_SECRET'), { subject: userId, expiresIn: ACCESS_TTL_MS / 1000 });
}

export function signRefresh(userId: string, tokenVersion: number): string {
  return jwt.sign({ tv: tokenVersion }, secret('JWT_REFRESH_SECRET'), {
    subject: userId,
    expiresIn: REFRESH_TTL_MS / 1000,
  });
}

/** Throws jwt.TokenExpiredError / JsonWebTokenError on a bad token. */
export function verifyAccess(token: string): { sub: string } {
  const payload = jwt.verify(token, secret('JWT_SECRET'), { algorithms: ['HS256'] });
  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw new jwt.JsonWebTokenError('Malformed access token');
  }
  return { sub: payload.sub };
}

export function verifyRefresh(token: string): { sub: string; tv: number } {
  const payload = jwt.verify(token, secret('JWT_REFRESH_SECRET'), { algorithms: ['HS256'] });
  if (typeof payload === 'string' || typeof payload.sub !== 'string' || typeof payload.tv !== 'number') {
    throw new jwt.JsonWebTokenError('Malformed refresh token');
  }
  return { sub: payload.sub, tv: payload.tv };
}

export function cookieOptions(maxAge: number, path = '/'): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path,
    maxAge,
  };
}

export function setAuthCookies(res: Response, userId: string, tokenVersion: number): void {
  // The cookie outlives the 15-minute JWT on purpose: the browser keeps sending the expired token,
  // so the server can answer TOKEN_EXPIRED (→ client refreshes) instead of NOT_AUTHENTICATED (→ logged out)
  res.cookie(ACCESS_COOKIE, signAccess(userId), cookieOptions(REFRESH_TTL_MS));
  res.cookie(REFRESH_COOKIE, signRefresh(userId, tokenVersion), cookieOptions(REFRESH_TTL_MS, REFRESH_COOKIE_PATH));
}

export function clearAuthCookies(res: Response): void {
  // Path must match the one the cookie was set with or the browser keeps it
  const { maxAge: _a, ...accessOpts } = cookieOptions(0);
  const { maxAge: _r, ...refreshOpts } = cookieOptions(0, REFRESH_COOKIE_PATH);
  res.clearCookie(ACCESS_COOKIE, accessOpts);
  res.clearCookie(REFRESH_COOKIE, refreshOpts);
}

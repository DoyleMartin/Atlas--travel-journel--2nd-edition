import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { User, type AuthUser } from '../features/users/user.model.js';
import { ACCESS_COOKIE, verifyAccess } from '../utils/generateToken.js';
import { HttpError } from './errorMiddleware.js';

function readToken(req: Request): string | undefined {
  const fromCookie: unknown = req.cookies?.[ACCESS_COOKIE];
  if (typeof fromCookie === 'string' && fromCookie) return fromCookie;

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return undefined;
}

type TokenCheck = { userId: string } | { error: 'expired' | 'invalid' };

function checkToken(token: string): TokenCheck {
  try {
    return { userId: verifyAccess(token).sub };
  } catch (err) {
    return { error: err instanceof jwt.TokenExpiredError ? 'expired' : 'invalid' };
  }
}

function loadUser(userId: string) {
  return User.findById(userId).lean<AuthUser>();
}

// The client refreshes only on TOKEN_EXPIRED, so a wrong password or a deleted account doesn't loop
const expired = () => new HttpError(401, 'Session expired', { code: 'TOKEN_EXPIRED' });
const unauthenticated = () => new HttpError(401, 'Not authenticated', { code: 'NOT_AUTHENTICATED' });

/** 401 unless the request carries a valid access token for an existing user. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = readToken(req);
  if (!token) throw unauthenticated();

  const check = checkToken(token);
  if ('error' in check) throw check.error === 'expired' ? expired() : unauthenticated();

  const user = await loadUser(check.userId);
  if (!user) throw unauthenticated();

  req.user = user;
  next();
};

/**
 * Attaches req.user when logged in; otherwise continues anonymously.
 * An *expired* token still gets a 401 so the client refreshes and retries instead of
 * silently showing the logged-out view. If the refresh fails, the cookies are cleared
 * and the retry goes through as anonymous.
 */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  const token = readToken(req);
  if (!token) return next();

  const check = checkToken(token);
  if ('error' in check) {
    if (check.error === 'expired') throw expired();
    return next();
  }

  const user = await loadUser(check.userId);
  if (user) req.user = user;
  next();
};

import type { RequestHandler } from 'express';
import { HttpError } from '../../middleware/errorMiddleware.js';
import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from '../../utils/generateToken.js';
import { loginUser, refreshSession, registerUser } from './auth.service.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';

export const register: RequestHandler = async (req, res) => {
  const user = await registerUser(req.body as RegisterInput);
  setAuthCookies(res, user.id, user.tokenVersion);
  res.status(201).json({ user });
};

export const login: RequestHandler = async (req, res) => {
  const user = await loginUser(req.body as LoginInput);
  setAuthCookies(res, user.id, user.tokenVersion);
  res.json({ user });
};

/** Issues a fresh access token and slides the refresh token's 7-day window. */
export const refresh: RequestHandler = async (req, res) => {
  const token: unknown = req.cookies?.[REFRESH_COOKIE];
  if (typeof token !== 'string' || !token) {
    throw new HttpError(401, 'Please log in again', { code: 'REFRESH_INVALID' });
  }

  try {
    const user = await refreshSession(token);
    setAuthCookies(res, user.id, user.tokenVersion);
    res.json({ user });
  } catch (err) {
    // Clear dead cookies so optionalAuth routes fall back to anonymous on retry
    clearAuthCookies(res);
    throw err;
  }
};

export const logout: RequestHandler = (_req, res) => {
  clearAuthCookies(res);
  res.status(204).end();
};

export const me: RequestHandler = (req, res) => {
  res.json({ user: req.user });
};

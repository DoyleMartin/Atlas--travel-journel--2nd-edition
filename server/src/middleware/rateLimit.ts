import { rateLimit } from 'express-rate-limit';

/** Register + login: 10 failed attempts per 15 minutes per IP. Successful requests don't count. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in 15 minutes.', code: 'RATE_LIMITED' },
});

// TODO (2c): geocodeLimiter

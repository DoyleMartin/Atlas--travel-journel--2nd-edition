import type { AuthUser } from '../features/users/user.model.js';

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth (always) and optionalAuth (when logged in). */
      user?: AuthUser;
    }
  }
}

export {};

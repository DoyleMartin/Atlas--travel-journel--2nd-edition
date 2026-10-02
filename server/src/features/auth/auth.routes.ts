import { Router } from 'express';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { authLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import { login, logout, me, refresh, register } from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.schemas.js';

const router = Router();

// validate runs first so malformed submissions don't count toward the lockout
router.post('/register', validate({ body: registerSchema }), authLimiter, register);
router.post('/login', validate({ body: loginSchema }), authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

export default router;

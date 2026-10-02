import { Router } from 'express';
import { optionalAuth, requireAuth } from '../../middleware/authMiddleware.js';
import { validate } from '../../middleware/validate.js';
import { deleteCountry, getUserMap, putCountry } from './map.controller.js';
import { countryCodeParams, upsertCountrySchema, userIdParams } from './map.schemas.js';

const router = Router();

// Literal paths before /:userId so "countries" is never read as a user id
router.post('/countries', requireAuth, validate({ body: upsertCountrySchema }), putCountry);
router.delete('/countries/:code', requireAuth, validate({ params: countryCodeParams }), deleteCountry);
router.get('/:userId', optionalAuth, validate({ params: userIdParams }), getUserMap);

export default router;

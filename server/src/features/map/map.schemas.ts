import { z } from 'zod';
import { countriesByCode } from '../../data/countries.js';
import { COUNTRY_STATUSES } from '../users/user.model.js';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const countryCode = z
  .string()
  .trim()
  .toUpperCase()
  .refine((code) => countriesByCode.has(code), 'Unknown country code');

export const userIdParams = z.object({ userId: objectId });

export const countryCodeParams = z.object({ code: countryCode });

export const upsertCountrySchema = z.object({
  code: countryCode,
  status: z.enum(COUNTRY_STATUSES).default('visited'),
});

export type UpsertCountryInput = z.infer<typeof upsertCountrySchema>;

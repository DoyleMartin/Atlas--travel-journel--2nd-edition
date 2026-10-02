import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

interface Schemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Validates and replaces req.body / req.params with the parsed (coerced, stripped) values.
 * Express 5 makes req.query a getter, so the parsed query goes on res.locals.query instead.
 * ZodErrors are thrown and turned into 400s by errorHandler.
 */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, res, next) => {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
    if (schemas.query) res.locals.query = schemas.query.parse(req.query);
    next();
  };

import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';

/**
 * Error with an HTTP status. Throw this from controllers/services: `throw new HttpError(404, 'Trip not found')`.
 * `code` is a stable machine-readable string the client can branch on (e.g. 'TOKEN_EXPIRED').
 */
export class HttpError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, opts: { code?: string; details?: unknown } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = opts.code;
    this.details = opts.details;
  }
}

export const notFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `Not found: ${req.method} ${req.originalUrl}`));
};

interface ErrorBody {
  message: string;
  code?: string;
  details?: unknown;
  stack?: string;
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let status = 500;
  const body: ErrorBody = { message: 'Something went wrong' };

  if (err instanceof HttpError) {
    status = err.status;
    body.message = err.message;
    if (err.code) body.code = err.code;
    if (err.details !== undefined) body.details = err.details;
  } else if (err instanceof ZodError) {
    status = 400;
    body.message = 'Validation failed';
    // First issue per field only — one message per form input
    const byPath = new Map<string, string>();
    for (const issue of err.issues) {
      const path = issue.path.join('.');
      if (!byPath.has(path)) byPath.set(path, issue.message);
    }
    body.details = [...byPath].map(([path, message]) => ({ path, message }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    body.message = 'Validation failed';
    body.details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    body.message = `Invalid ${err.path}`;
  } else if (isDuplicateKeyError(err)) {
    status = 409;
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'value';
    body.message = `That ${field} is already taken`;
    body.details = [{ path: field, message: body.message }];
  } else if (isBodyParserError(err)) {
    status = err.status;
    body.message = err.type === 'entity.too.large' ? 'Request body too large' : 'Malformed request body';
  }

  if (status >= 500) console.error(err);
  if (process.env.NODE_ENV !== 'production' && err instanceof Error) body.stack = err.stack;

  res.status(status).json(body);
};

function isDuplicateKeyError(err: unknown): err is { code: 11000; keyValue?: Record<string, unknown> } {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}

function isBodyParserError(err: unknown): err is { status: number; type: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    typeof (err as { status?: unknown }).status === 'number' &&
    typeof (err as { type?: unknown }).type === 'string'
  );
}

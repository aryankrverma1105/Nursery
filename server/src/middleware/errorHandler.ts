import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(`[ERROR] ${req.method} ${req.url}:`, err.message || err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  // Never leak internal stack traces to the client in production or dev
  const message = statusCode === 500 ? 'Internal server error occurred. Please try again later.' : err.message;

  return res.status(statusCode).json({
    error: message,
  });
}


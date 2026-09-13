import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) return res.status(400).json({ message: 'Validation failed', issues: error.issues });
  console.error(error);
  res.status(500).json({ message: 'Something went wrong' });
};


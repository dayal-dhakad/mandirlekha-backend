import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    req.ownerId = payload.sub;
    next();
  } catch {
    res.status(401).json({ message: 'Session expired' });
  }
}


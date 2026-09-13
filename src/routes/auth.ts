import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { Owner } from '../models/Owner.js';

export const authRouter = Router();
const credentials = z.object({ email: z.email(), password: z.string().min(8).max(200) });

authRouter.post('/login', async (req, res) => {
  const input = credentials.parse(req.body);
  const owner = await Owner.findOne({ email: input.email.toLowerCase() });
  if (!owner || !(await bcrypt.compare(input.password, owner.passwordHash))) return res.status(401).json({ message: 'Invalid email or password' });
  const token = jwt.sign({ sub: owner.id, v: owner.tokenVersion }, env.JWT_SECRET, { expiresIn: '30d' });
  res.cookie('session', token, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 30 * 24 * 60 * 60 * 1000, path: '/' });
  res.json({ owner: { id: owner.id, name: owner.name, email: owner.email } });
});

authRouter.post('/logout', (_req, res) => { res.clearCookie('session', { path: '/' }); res.status(204).end(); });
authRouter.get('/me', requireAuth, async (req, res) => {
  const owner = await Owner.findById(req.ownerId).select('name email');
  if (!owner) return res.status(401).json({ message: 'Owner not found' });
  res.json({ owner });
});


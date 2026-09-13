import { z } from 'zod';

const money = z.number().finite().positive().max(100_000_000).transform(value => Math.round(value * 100));
const item = z.object({
  description: z.string().trim().min(1).max(200),
  amount: money,
  paidTo: z.string().trim().max(200).optional().default(''),
  notes: z.string().trim().max(1000).optional().default(''),
});

export const transactionInput = z.object({
  location: z.enum(['MANDIR', 'DHARAMSHALA']),
  type: z.enum(['INCOME', 'EXPENSE']),
  date: z.iso.date(),
  items: z.array(item).min(1).max(100),
});

export const transactionQuery = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  location: z.enum(['MANDIR', 'DHARAMSHALA']).optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

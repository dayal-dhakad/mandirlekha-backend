import { Router } from 'express';
import { z } from 'zod';
import { Transaction } from '../models/Transaction.js';

export const dashboardRouter = Router();
dashboardRouter.get('/', async (req, res) => {
  const q = z.object({ from: z.iso.date(), to: z.iso.date() }).parse(req.query);
  const rows = await Transaction.aggregate([{ $match: { date: { $gte: q.from, $lte: q.to } } }, { $group: { _id: { location: '$location', type: '$type' }, amount: { $sum: '$totalPaise' } } }]);
  const openings = await Transaction.aggregate([{ $match: { type: 'OPENING_BALANCE', date: { $lte: q.to } } }, { $group: { _id: '$location', amount: { $sum: '$totalPaise' } } }]);
  const result: any = { MANDIR: { income: 0, expense: 0, openingBalance: 0, balance: 0 }, DHARAMSHALA: { income: 0, expense: 0, openingBalance: 0, balance: 0 } };
  for (const row of rows) if (row._id.type !== 'OPENING_BALANCE') result[row._id.location][row._id.type === 'INCOME' ? 'income' : 'expense'] = row.amount / 100;
  for (const row of openings) result[row._id].openingBalance = row.amount / 100;
  for (const place of Object.values(result) as any[]) place.balance = place.openingBalance + place.income - place.expense;
  res.json({ locations: result, overall: { income: result.MANDIR.income + result.DHARAMSHALA.income, expense: result.MANDIR.expense + result.DHARAMSHALA.expense, balance: result.MANDIR.balance + result.DHARAMSHALA.balance } });
});


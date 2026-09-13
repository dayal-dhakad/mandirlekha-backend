import { Router } from 'express';
import { transactionInput, transactionQuery } from '../schemas/transaction.js';
import { Transaction } from '../models/Transaction.js';

export const transactionRouter = Router();
const serialize = (doc: any) => ({ id: doc.id, location: doc.location, type: doc.type, date: doc.date, total: doc.totalPaise / 100, items: doc.items.map((i: any) => ({ id: i.id, description: i.description, amount: i.amountPaise / 100, paidTo: i.paidTo, notes: i.notes })), createdAt: doc.createdAt });
const build = (input: ReturnType<typeof transactionInput.parse>) => {
  const items = input.items.map(({ amount, ...rest }) => ({ ...rest, amountPaise: amount }));
  return { ...input, items, totalPaise: items.reduce((sum, i) => sum + i.amountPaise, 0) };
};

transactionRouter.get('/', async (req, res) => {
  const q = transactionQuery.parse(req.query); const filter: any = {};
  if (q.from || q.to) filter.date = { ...(q.from && { $gte: q.from }), ...(q.to && { $lte: q.to }) };
  if (q.location) filter.location = q.location; if (q.type) filter.type = q.type;
  const [docs, total] = await Promise.all([Transaction.find(filter).sort({ date: -1, createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit), Transaction.countDocuments(filter)]);
  res.json({ data: docs.map(serialize), pagination: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) } });
});
transactionRouter.get('/:id', async (req, res) => { const doc = await Transaction.findById(req.params.id); if (!doc) return res.status(404).json({ message: 'Entry not found' }); res.json(serialize(doc)); });
transactionRouter.post('/', async (req, res) => { const doc = await Transaction.create(build(transactionInput.parse(req.body))); res.status(201).json(serialize(doc)); });
transactionRouter.put('/:id', async (req, res) => { const doc = await Transaction.findByIdAndUpdate(req.params.id, build(transactionInput.parse(req.body)), { new: true, runValidators: true }); if (!doc) return res.status(404).json({ message: 'Entry not found' }); res.json(serialize(doc)); });
transactionRouter.delete('/:id', async (req, res) => { const doc = await Transaction.findByIdAndDelete(req.params.id); if (!doc) return res.status(404).json({ message: 'Entry not found' }); res.status(204).end(); });

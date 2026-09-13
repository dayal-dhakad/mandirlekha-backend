import { Schema, model } from 'mongoose';

export const LOCATIONS = ['MANDIR', 'DHARAMSHALA'] as const;
export const TYPES = ['INCOME', 'EXPENSE', 'OPENING_BALANCE'] as const;

const itemSchema = new Schema({
  description: { type: String, required: true, trim: true },
  amountPaise: { type: Number, required: true, min: 1 },
  paidTo: { type: String, trim: true },
  notes: { type: String, trim: true },
}, { _id: true });

const transactionSchema = new Schema({
  location: { type: String, enum: LOCATIONS, required: true, index: true },
  type: { type: String, enum: TYPES, required: true, index: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
  items: { type: [itemSchema], required: true, validate: [(v: unknown[]) => v.length > 0, 'At least one item is required'] },
  totalPaise: { type: Number, required: true, min: 1 },
}, { timestamps: true });

transactionSchema.index({ date: -1, createdAt: -1 });
export const Transaction = model('Transaction', transactionSchema);

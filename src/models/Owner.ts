import { Schema, model } from 'mongoose';

const ownerSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  tokenVersion: { type: Number, default: 0 },
}, { timestamps: true });

export const Owner = model('Owner', ownerSchema);


import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { Owner } from '../models/Owner.js';

await connectDatabase();
const name = process.env.OWNER_NAME ?? 'Owner'; const email = process.env.OWNER_EMAIL; const password = process.env.OWNER_PASSWORD;
if (!email || !password || password.length < 12) throw new Error('Set OWNER_EMAIL and an OWNER_PASSWORD of at least 12 characters');
if (await Owner.countDocuments()) throw new Error('An owner already exists; exactly one owner is allowed');
await Owner.create({ name, email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12) });
console.log(`Owner created for ${email}`); process.exit(0);


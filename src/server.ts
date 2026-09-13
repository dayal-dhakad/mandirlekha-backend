import { app } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';

await connectDatabase();
app.listen(env.PORT, () => console.log(`API listening on port ${env.PORT}`));


import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';
import { verifyMail } from './utils/mailer.js';

await connectDb();

createApp().listen(env.port, () => {
  console.log(`API ALTO sur http://localhost:${env.port}`);
  verifyMail();
});

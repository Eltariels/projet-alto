// Point d'entrée de l'API sur Vercel : une fonction serverless qui sert toutes les routes /api/*.
// En local, c'est server/src/index.js qui lance l'API (npm run dev).
import { connectDb } from '../server/src/config/db.js';
import { createApp } from '../server/src/app.js';

const app = createApp();

export default async function handler(req, res) {
  await connectDb();
  return app(req, res);
}

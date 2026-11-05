import mongoose from 'mongoose';
import { env } from './env.js';

let connecting = null;

// Sur Vercel, chaque appel peut réutiliser une fonction déjà « chaude » : on garde la connexion ouverte
// et on ne se connecte qu'une fois, même si plusieurs requêtes arrivent en même temps.
export async function connectDb() {
  if (mongoose.connection.readyState === 1) return;
  connecting ??= mongoose
    .connect(env.mongoUri, { serverSelectionTimeoutMS: 10_000 })
    .then(() => console.log(`MongoDB connecté (${mongoose.connection.name})`))
    .catch((err) => {
      connecting = null; // on réessaiera au prochain appel
      throw err;
    });
  mongoose.set('strictQuery', true);
  await connecting;
}

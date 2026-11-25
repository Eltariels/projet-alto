import { Router } from 'express';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { User } from '../models/index.js';

const router = Router();

// Compteurs publics affichés dans le pied de page : visites du site et étudiants inscrits.
// Le front n'appelle POST qu'une fois par visite (onglet ouvert), pas à chaque page.
const counters = () => mongoose.connection.db.collection('counters');
const inscrits = () => User.countDocuments({ role: 'etudiant' });

// Évite qu'un script gonfle le compteur : 30 visites comptées par heure et par IP au maximum
const visitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: async (req, res) =>
    res.json({ visits: (await counters().findOne({ _id: 'visites' }))?.count ?? 0, users: await inscrits() }),
});

router.get('/', async (req, res) => {
  const doc = await counters().findOne({ _id: 'visites' });
  res.json({ visits: doc?.count ?? 0, users: await inscrits() });
});

router.post('/visite', visitLimiter, async (req, res) => {
  const doc = await counters().findOneAndUpdate(
    { _id: 'visites' },
    { $inc: { count: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  res.json({ visits: doc?.count ?? 1, users: await inscrits() });
});

export default router;

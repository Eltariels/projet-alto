import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';

function limiter({ windowMinutes, limit, message, byEmail = false, byUser = false }) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Les tests enchaînent des dizaines d'inscriptions depuis la même machine
    skip: () => env.isTest,
    // Par adresse IP, et par e-mail visé pour la connexion : on freine les essais de mots de passe sur un compte
    // Par compte pour l'IA (chaque appel coûte), sinon par adresse IP
    keyGenerator: (req) =>
      byUser && req.auth?.userId
        ? `user:${req.auth.userId}`
        : ipKeyGenerator(req.ip) + (byEmail ? `:${String(req.body?.email || '').toLowerCase()}` : ''),
    handler: (req, res) => res.status(429).json({ error: message }),
  });
}

export const loginLimiter = limiter({
  windowMinutes: 15,
  limit: 10,
  byEmail: true,
  message: 'Trop de tentatives de connexion. Réessaie dans 15 minutes.',
});

export const registerLimiter = limiter({
  windowMinutes: 60,
  limit: 20,
  message: "Trop d'inscriptions depuis cette connexion. Réessaie plus tard.",
});

export const resetLimiter = limiter({
  windowMinutes: 15,
  limit: 5,
  message: 'Trop de demandes. Réessaie dans 15 minutes.',
});

// Chaque appel à l'IA est facturé : 40 par heure et par compte suffisent largement pour publier des offres
export const aiLimiter = limiter({
  windowMinutes: 60,
  limit: 40,
  byUser: true,
  message: "Trop de demandes à l'IA depuis ce compte. Réessayez dans une heure.",
});

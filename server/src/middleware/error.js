import { ZodError } from 'zod';
import { env } from '../config/env.js';

export function notFound(req, res) {
  res.status(404).json({ error: 'Route introuvable' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Données invalides', details: err.issues });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Fichier trop lourd : 5 Mo maximum' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Un seul fichier PDF est accepté' });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Cette ressource existe déjà' });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: status >= 500 && env.isProd ? 'Erreur serveur' : err.message,
  });
}

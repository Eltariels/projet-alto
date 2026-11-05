import { Event } from '../models/index.js';

export async function trackEvent(type, user, meta) {
  try {
    await Event.create({ type, user: user._id, school: user.school, promo: user.promo, meta });
  } catch (err) {
    // Le suivi ne doit jamais faire échouer l'action de l'utilisateur
    console.error(`Événement ${type} non enregistré :`, err.message);
  }
}

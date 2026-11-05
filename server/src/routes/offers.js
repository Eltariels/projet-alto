import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Application, NIVEAUX, Offer, Profile, User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { computeScore } from '../utils/score.js';
import { canonicalSkill } from '../utils/skills.js';
import { isComplete } from './profile.js';

const router = Router();
router.use(requireAuth);

const PAGE_SIZE = 10;

const listSchema = z.object({
  secteur: z.string().trim().max(80).optional(),
  ville: z.string().trim().max(80).optional(),
  niveau: z.enum(NIVEAUX).optional(),
  rythme: z.string().trim().max(80).optional(),
  q: z.string().trim().max(80).optional(),
  tri: z.enum(['score', 'date']).optional().default('score'),
  favoris: z.enum(['1']).optional(),
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
});

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const applicationOf = (app) => (app ? { id: app._id, status: app.status, sentAt: app.createdAt } : null);

function toSummary(offer, scoring, { app, favorite }) {
  return {
    id: offer._id,
    title: offer.title,
    emitter: { name: offer.emitter.name },
    ville: offer.ville,
    secteur: offer.secteur,
    niveau: offer.niveau,
    rythme: offer.rythme,
    badge: offer.analysis?.badge || null,
    badgeReason: offer.analysis?.reason || null,
    analysisStatus: offer.analysis?.status,
    score: scoring.score,
    hint: scoring.hint,
    publishedAt: offer.createdAt,
    application: applicationOf(app),
    favorite,
  };
}

// Une offre suspecte ne passe jamais devant une offre fiable, même si elle colle mieux au profil
const rank = (o) => (o.badge === 'suspecte' ? 1 : 0);
const SORTS = {
  score: (a, b) => rank(a) - rank(b) || b.score - a.score || b.publishedAt - a.publishedAt,
  date: (a, b) => rank(a) - rank(b) || b.publishedAt - a.publishedAt || b.score - a.score,
};

async function context(userId) {
  const [profile, user, apps] = await Promise.all([
    Profile.findOne({ user: userId }).lean(),
    User.findById(userId).select('favorites').lean(),
    Application.find({ user: userId }).lean(),
  ]);
  return {
    profile,
    favorites: new Set((user?.favorites || []).map(String)),
    appByOffer: new Map(apps.map((a) => [String(a.offer), a])),
  };
}

router.get('/', async (req, res) => {
  const { q, tri, favoris, page, ...filters } = listSchema.parse(req.query);
  const { profile, favorites, appByOffer } = await context(req.auth.userId);

  const query = { active: true };
  for (const [key, value] of Object.entries(filters)) if (value) query[key] = value;
  if (favoris) query._id = { $in: [...favorites] };
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    query.$or = [
      { title: re },
      { 'emitter.name': re },
      { description: re },
      { secteur: re },
      { 'analysis.criteria.competences': re },
    ];
  }

  const [offers, facets] = await Promise.all([
    Offer.find(query).lean(),
    Promise.all(['secteur', 'ville', 'niveau', 'rythme'].map((f) => Offer.distinct(f, { active: true }))),
  ]);

  // Le score dépend du profil : on le calcule pour toutes les offres filtrées, puis on découpe la page
  const all = offers
    .map((o) =>
      toSummary(o, computeScore(profile, o), { app: appByOffer.get(String(o._id)), favorite: favorites.has(String(o._id)) }),
    )
    .sort(SORTS[tri]);
  const items = all.slice(0, page * PAGE_SIZE);

  const [secteur, ville, niveau, rythme] = facets.map((values) =>
    values.filter(Boolean).sort((a, b) => a.localeCompare(b, 'fr')),
  );

  res.json({
    items,
    total: all.length,
    verified: all.filter((o) => o.badge === 'verifiee').length,
    hasMore: all.length > items.length,
    page,
    favoritesCount: favorites.size,
    filters: { secteur, ville, niveau, rythme },
    profileComplete: isComplete(profile),
  });
});

router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Offre introuvable');
  const [offer, { profile, favorites, appByOffer }] = await Promise.all([
    Offer.findOne({ _id: req.params.id, active: true }).lean(),
    context(req.auth.userId),
  ]);
  if (!offer) throw new HttpError(404, 'Offre introuvable');

  const scoring = computeScore(profile, offer);
  const meta = (o) => ({ app: appByOffer.get(String(o._id)), favorite: favorites.has(String(o._id)) });

  // Offres proches : même secteur ou au moins une compétence demandée en commun, jamais suspectes
  const skills = new Set((offer.analysis?.criteria?.competences || []).map(canonicalSkill));
  const candidates = await Offer.find({
    _id: { $ne: offer._id },
    active: true,
    'analysis.badge': { $ne: 'suspecte' },
  }).lean();
  const similar = candidates
    .filter(
      (o) =>
        o.secteur === offer.secteur ||
        (o.analysis?.criteria?.competences || []).some((c) => skills.has(canonicalSkill(c))),
    )
    .map((o) => toSummary(o, computeScore(profile, o), meta(o)))
    .sort(SORTS.score)
    .slice(0, 3);

  res.json({
    offer: {
      ...toSummary(offer, scoring, meta(offer)),
      description: offer.description,
      experienceRequise: offer.experienceRequise,
      sourceUrl: offer.source?.url || null,
      siretStatus: offer.siretCheck?.status,
      matches: scoring.matches,
      missing: scoring.missing,
    },
    similar,
    profileComplete: isComplete(profile),
  });
});

// Mettre de côté / retirer des favoris
router.put('/:id/favori', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id) || !(await Offer.exists({ _id: req.params.id, active: true }))) {
    throw new HttpError(404, 'Offre introuvable');
  }
  await User.updateOne({ _id: req.auth.userId }, { $addToSet: { favorites: req.params.id } });
  res.json({ favorite: true });
});

router.delete('/:id/favori', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Offre introuvable');
  await User.updateOne({ _id: req.auth.userId }, { $pull: { favorites: req.params.id } });
  res.json({ favorite: false });
});

export default router;

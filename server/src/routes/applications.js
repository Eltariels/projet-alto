import { Router } from 'express';
import mongoose from 'mongoose';
import { copyFile } from '../utils/files.js';
import { z } from 'zod';
import { Application, APPLICATION_STATUSES, Event, Offer, Profile, User } from '../models/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { trackEvent } from '../utils/events.js';
import { computeScore } from '../utils/score.js';
import { isComplete } from './profile.js';

const router = Router();
router.use(requireAuth, requireRole('etudiant'));

function toPublic(app, offer) {
  return {
    id: app._id,
    status: app.status,
    score: app.score,
    sentAt: app.createdAt,
    updatedAt: app.updatedAt,
    note: app.note || '',
    // Les candidatures créées avant l'historique ont au moins leur envoi
    history: app.history?.length ? app.history : [{ status: 'envoyee', at: app.createdAt }],
    offer: offer && {
      id: offer._id,
      title: offer.title,
      emitter: { name: offer.emitter.name },
      ville: offer.ville,
      badge: offer.analysis?.badge || null,
      active: offer.active,
    },
  };
}

// Candidature en un clic : le profil est envoyé tel quel, figé au moment de l'envoi
router.post('/', async (req, res) => {
  const { offerId } = z.object({ offerId: z.string() }).parse(req.body);
  if (!mongoose.isValidObjectId(offerId)) throw new HttpError(404, 'Offre introuvable');

  const [offer, profile, user] = await Promise.all([
    Offer.findOne({ _id: offerId, active: true }).lean(),
    Profile.findOne({ user: req.auth.userId }).lean(),
    User.findById(req.auth.userId),
  ]);
  if (!offer) throw new HttpError(404, 'Offre introuvable');
  if (!isComplete(profile)) throw new HttpError(400, 'Complète ton profil avant de postuler');
  if (await Application.exists({ user: user._id, offer: offer._id })) {
    throw new HttpError(409, 'Tu as déjà postulé à cette offre');
  }

  const { formation, niveau, competences, ville, rythme, formationPrecedente, diplomeObtenu, telephone, adresse, cvWebUrl } =
    profile;
  const app = new Application({
    user: user._id,
    offer: offer._id,
    score: computeScore(profile, offer).score,
    history: [{ status: 'envoyee', at: new Date() }],
    profileSnapshot: {
      email: user.email,
      formation,
      niveau,
      competences,
      ville,
      rythme,
      formationPrecedente,
      diplomeObtenu,
      telephone,
      adresse,
      cvWebUrl,
    },
  });

  // Copie du CV au moment de l'envoi : remplacer son CV plus tard ne modifie pas une candidature déjà partie
  if (profile.cv?.fileId) {
    const fileId = await copyFile(profile.cv.fileId, profile.cv.originalName, { application: app._id, kind: 'candidature' });
    app.profileSnapshot.cv = { fileId, originalName: profile.cv.originalName, size: profile.cv.size };
  }
  await app.save();

  await trackEvent('candidature', user, { offer: offer._id, badge: offer.analysis?.badge });
  res.status(201).json({ application: toPublic(app, offer) });
});

router.get('/', async (req, res) => {
  const apps = await Application.find({ user: req.auth.userId }).sort({ createdAt: -1 }).populate('offer').lean();
  const items = apps.map((a) => toPublic(a, a.offer));
  const counts = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, items.filter((i) => i.status === s).length]));
  res.json({ items, total: items.length, counts });
});

// L'étudiant tient lui-même son statut à jour (c'est ce que la relance par e-mail lui demande) et peut noter ce qu'il veut
const updateSchema = z
  .object({
    status: z.enum(APPLICATION_STATUSES).optional(),
    note: z.string().trim().max(1000, 'Note trop longue : 1000 caractères maximum').optional(),
  })
  .refine((d) => d.status !== undefined || d.note !== undefined, 'Rien à modifier');

router.patch('/:id', async (req, res) => {
  const { status, note } = updateSchema.parse(req.body);
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Candidature introuvable');

  const app = await Application.findOne({ _id: req.params.id, user: req.auth.userId }).populate('offer');
  if (!app) throw new HttpError(404, 'Candidature introuvable');

  if (note !== undefined) app.note = note;
  if (status && status !== app.status) {
    if (!app.history?.length) app.history = [{ status: 'envoyee', at: app.createdAt }];
    app.status = status;
    app.history.push({ status, at: new Date() });
  }
  await app.save();

  // Un entretien obtenu = la North Star : on ne le compte qu'une fois par candidature
  if (status === 'entretien' && !(await Event.exists({ user: app.user, type: 'entretien', 'meta.application': app._id }))) {
    const user = await User.findById(app.user);
    await trackEvent('entretien', user, { application: app._id, offer: app.offer?._id });
  }

  res.json({ application: toPublic(app, app.offer) });
});

export default router;

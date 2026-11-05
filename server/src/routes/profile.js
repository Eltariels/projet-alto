import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { Event, NIVEAUX, Profile, User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { trackEvent } from '../utils/events.js';
import { HttpError } from '../utils/httpError.js';
import { CV_DIR, CV_MAX_BYTES, isPdf, safeName } from '../utils/files.js';

const router = Router();
router.use(requireAuth);

const text = (max) => z.string().trim().max(max);
const optionalText = (max) => text(max).optional().default('');

const profileSchema = z.object({
  formation: optionalText(120),
  niveau: z.enum(NIVEAUX).nullable().optional().default(null),
  competences: z
    .array(text(40).min(1))
    .max(20, '20 compétences maximum')
    .optional()
    .default([])
    // Pas de doublon, à la casse près : on garde la première saisie
    .transform((list) => list.filter((c, i) => list.findIndex((o) => o.toLowerCase() === c.toLowerCase()) === i)),
  ville: optionalText(80),
  rythme: optionalText(80),

  formationPrecedente: optionalText(120),
  diplomeObtenu: optionalText(120),
  telephone: optionalText(25).refine(
    (v) => !v || /^\+?[\d\s.()-]{8,20}$/.test(v),
    'Numéro de téléphone invalide',
  ),
  adresse: optionalText(200),
  cvWebUrl: optionalText(300).refine(
    (v) => !v || /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(v),
    'Le lien du CV doit commencer par https://',
  ),
});

export function isComplete(p) {
  return Boolean(p?.formation && p?.niveau && p?.competences?.length && p?.ville && p?.rythme);
}

function toPublic(p) {
  const profile = {
    formation: p?.formation || '',
    niveau: p?.niveau || null,
    competences: p?.competences || [],
    ville: p?.ville || '',
    rythme: p?.rythme || '',
    formationPrecedente: p?.formationPrecedente || '',
    diplomeObtenu: p?.diplomeObtenu || '',
    telephone: p?.telephone || '',
    adresse: p?.adresse || '',
    cvWebUrl: p?.cvWebUrl || '',
  };
  const cv = p?.cv ? { name: p.cv.originalName, size: p.cv.size, uploadedAt: p.cv.uploadedAt } : null;
  return { profile, cv, complete: isComplete(profile), updatedAt: p?.updatedAt || null };
}

router.get('/', async (req, res) => {
  const profile = await Profile.findOne({ user: req.auth.userId });
  res.json(toPublic(profile));
});

router.put('/', async (req, res) => {
  const data = profileSchema.parse(req.body);
  const profile = await Profile.findOneAndUpdate(
    { user: req.auth.userId },
    { $set: data },
    { new: true, upsert: true, runValidators: true },
  );

  // « Profil complété » ne compte qu'une fois par étudiant (KPI d'activation)
  if (isComplete(profile) && !(await Event.exists({ user: req.auth.userId, type: 'profil_complete' }))) {
    const user = await User.findById(req.auth.userId);
    await trackEvent('profil_complete', user);
  }

  res.json(toPublic(profile));
});

// CV à imprimer : un seul PDF par étudiant, remplacé à chaque dépôt
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: CV_MAX_BYTES, files: 1 } });

router.post('/cv', upload.single('cv'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Aucun fichier reçu');
  if (!isPdf(req.file.buffer)) throw new HttpError(400, 'Le CV doit être un fichier PDF');

  // Multer décode le nom en latin1 : on le remet en UTF-8 pour garder les accents
  const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const storedName = `${req.auth.userId}-${randomUUID()}.pdf`;
  await writeFile(path.join(CV_DIR, storedName), req.file.buffer);

  const previous = await Profile.findOne({ user: req.auth.userId }).select('cv');
  const profile = await Profile.findOneAndUpdate(
    { user: req.auth.userId },
    { $set: { cv: { storedName, originalName: safeName(originalName), size: req.file.size, uploadedAt: new Date() } } },
    { new: true, upsert: true },
  );
  if (previous?.cv?.storedName) await unlink(path.join(CV_DIR, previous.cv.storedName)).catch(() => {});

  res.status(201).json(toPublic(profile));
});

router.get('/cv', async (req, res) => {
  const profile = await Profile.findOne({ user: req.auth.userId }).select('cv');
  if (!profile?.cv) throw new HttpError(404, 'Aucun CV déposé');
  res.download(path.join(CV_DIR, profile.cv.storedName), profile.cv.originalName, {
    headers: { 'Content-Type': 'application/pdf' },
  });
});

router.delete('/cv', async (req, res) => {
  const profile = await Profile.findOne({ user: req.auth.userId });
  if (profile?.cv?.storedName) {
    await unlink(path.join(CV_DIR, profile.cv.storedName)).catch(() => {});
    profile.cv = null;
    await profile.save();
  }
  res.json(toPublic(profile));
});

export default router;

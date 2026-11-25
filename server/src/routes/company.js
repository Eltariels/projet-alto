import { Router } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Application, Company, COMPANY_STATUSES, CONTRATS, Event, NIVEAUX, Offer, User } from '../models/index.js';
import { requireAuth, requireRole, setAuthCookie, signToken } from '../middleware/auth.js';
import { aiLimiter, registerLimiter } from '../middleware/rateLimit.js';
import { HttpError } from '../utils/httpError.js';
import { trackEvent } from '../utils/events.js';
import { openFile } from '../utils/files.js';
import { cleanSiret, sirene } from '../utils/sirene.js';
import { ai, AiError } from '../ai/offerAi.js';
import { verifyOffer } from '../ai/review.js';

// Espace entreprise : publier ses offres (fiche de poste mise en forme par l'IA), suivre ses candidats
const router = Router();

const text = (max) => z.string().trim().max(max);
const optionalText = (max) => text(max).optional().default('');

const siretCheckFrom = ({ status, officialName, city, activity }) => ({
  status,
  officialName,
  city,
  activity,
  checkedAt: status === 'non_verifie' ? undefined : new Date(),
});

const companyPublic = (c) => ({
  id: c._id,
  name: c.name,
  siret: c.siret,
  siretCheck: { status: c.siretCheck?.status, officialName: c.siretCheck?.officialName, city: c.siretCheck?.city },
});

// --- Inscription (publique) ---

const registerSchema = z.object({
  email: z.string().email('E-mail invalide'),
  password: z.string().min(8, 'Au moins 8 caractères'),
  companyName: text(120).min(2, "Indiquez le nom de l'entreprise"),
  siret: z.string().transform(cleanSiret).pipe(z.string().regex(/^\d{14}$/, 'Le SIRET compte 14 chiffres')),
});

const SIRET_REFUSED = {
  format: 'Le SIRET compte 14 chiffres.',
  introuvable: "Ce SIRET est introuvable dans l'annuaire des entreprises. Vérifiez les 14 chiffres.",
  ferme: "Cet établissement est fermé d'après l'annuaire des entreprises.",
};

router.post('/inscription', registerLimiter, async (req, res) => {
  const { email, password, companyName, siret } = registerSchema.parse(req.body);

  if (await User.exists({ email: email.toLowerCase() })) {
    throw new HttpError(409, 'Un compte existe déjà avec cet e-mail');
  }
  // Un SIRET, un espace : sinon n'importe qui pourrait rejoindre une entreprise et voir ses candidats
  if (await Company.exists({ siret })) {
    throw new HttpError(409, "Un espace entreprise existe déjà pour ce SIRET : connectez-vous avec le compte qui l'a créé.");
  }

  // SIRET inconnu ou fermé : refusé. Annuaire injoignable : l'inscription passe, le contrôle sera refait.
  const check = await sirene.verify(siret);
  if (check.status === 'invalide') throw new HttpError(400, SIRET_REFUSED[check.reason] || SIRET_REFUSED.introuvable);

  const company = await Company.create({ name: companyName, siret, siretCheck: siretCheckFrom(check) });
  let user;
  try {
    user = await User.create({
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'entreprise',
      company: company._id,
    });
  } catch (err) {
    await Company.deleteOne({ _id: company._id });
    throw err;
  }

  setAuthCookie(res, signToken(user));
  res.status(201).json({ user: user.toPublic() });
});

// --- Tout le reste : connecté avec un compte entreprise ---

router.use(requireAuth, requireRole('entreprise'));

async function myCompany(req) {
  const user = await User.findById(req.auth.userId).select('company');
  const company = user?.company && (await Company.findById(user.company));
  if (!company) throw new HttpError(403, 'Aucune entreprise rattachée à ce compte');
  return company;
}

// L'annuaire ne répondait pas à l'inscription : on retente avant de publier ou de relancer une analyse
async function refreshSiret(company) {
  if (company.siretCheck?.status !== 'non_verifie') return company;
  const check = await sirene.verify(company.siret);
  if (check.status !== 'non_verifie') {
    company.siretCheck = siretCheckFrom(check);
    await company.save();
  }
  return company;
}

async function ownOffer(id, company) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'Offre introuvable');
  const offer = await Offer.findOne({ _id: id, company: company._id });
  if (!offer) throw new HttpError(404, 'Offre introuvable');
  return offer;
}

function toCompanyOffer(o) {
  return {
    id: o._id,
    title: o.title,
    ville: o.ville,
    secteur: o.secteur || '',
    niveau: o.niveau,
    rythme: o.rythme,
    contrat: o.contrat || null,
    duree: o.duree || '',
    missions: o.missions || [],
    profilRecherche: o.profilRecherche || '',
    formation: o.analysis?.criteria?.formation || '',
    competences: o.analysis?.criteria?.competences || [],
    experienceRequise: o.experienceRequise || '',
    remuneration: o.remuneration || '',
    badge: o.analysis?.badge || null,
    badgeReason: o.analysis?.reason || null,
    analysisStatus: o.analysis?.status,
    active: o.active,
    publishedAt: o.createdAt,
  };
}

router.get('/moi', async (req, res) => {
  const company = await myCompany(req);
  res.json({ company: companyPublic(company), ai: ai.enabled() });
});

// --- Appel 1 : l'IA remet l'annonce en forme. Rien n'est enregistré : l'entreprise relit avant de publier. ---

const draftSchema = z.object({
  texte: text(12000).min(80, "Collez l'annonce complète : 80 caractères au moins"),
});

router.post('/offres/mise-en-forme', aiLimiter, async (req, res) => {
  const { texte } = draftSchema.parse(req.body);
  const company = await myCompany(req);
  if (!ai.enabled()) {
    throw new HttpError(503, "La mise en forme par l'IA n'est pas disponible pour l'instant : remplissez la fiche vous-même.");
  }
  try {
    const fiche = await ai.format({
      rawText: texte,
      emitter: { name: company.name, siret: company.siret, siretCheck: company.siretCheck },
      companyId: company._id,
    });
    res.json({ fiche });
  } catch (err) {
    if (!(err instanceof AiError)) console.error('Mise en forme :', err);
    throw new HttpError(502, "La mise en forme par l'IA n'a pas abouti. Réessayez, ou remplissez la fiche vous-même.");
  }
});

// --- Publication, puis appel 2 : la vérification donne le badge ---

const offerSchema = z.object({
  texte: optionalText(12000),
  title: text(120).min(3, "Indiquez l'intitulé du poste"),
  ville: text(80).min(2, 'Indiquez la ville'),
  contrat: z.enum(CONTRATS).nullable().optional().default(null),
  duree: optionalText(60),
  rythme: text(80).min(2, "Indiquez le rythme d'alternance"),
  niveau: z.enum(NIVEAUX, { message: 'Choisissez le niveau du diplôme préparé' }),
  secteur: optionalText(60),
  missions: z.array(text(300).min(1)).min(1, 'Décrivez au moins une mission').max(10, '10 missions au plus'),
  profilRecherche: optionalText(600),
  formation: optionalText(200),
  competences: z.array(text(40).min(1)).max(12, '12 compétences au plus').optional().default([]),
  experienceRequise: optionalText(200),
  remuneration: optionalText(200),
});

// Texte lisible de l'offre : affiché aux étudiants et parcouru par la recherche
const describeOffer = (d) =>
  [
    `Missions :\n${d.missions.map((m) => `- ${m}`).join('\n')}`,
    d.profilRecherche && `Profil recherché : ${d.profilRecherche}`,
  ]
    .filter(Boolean)
    .join('\n\n');

router.post('/offres', aiLimiter, async (req, res) => {
  const d = offerSchema.parse(req.body);
  const company = await refreshSiret(await myCompany(req));

  const _id = new mongoose.Types.ObjectId();
  const offer = await Offer.create({
    _id,
    title: d.title,
    emitter: { name: company.name, siret: company.siret },
    company: company._id,
    publishedBy: req.auth.userId,
    ville: d.ville,
    secteur: d.secteur || undefined,
    niveau: d.niveau,
    rythme: d.rythme,
    contrat: d.contrat || undefined,
    duree: d.duree || undefined,
    missions: d.missions,
    profilRecherche: d.profilRecherche || undefined,
    remuneration: d.remuneration || undefined,
    experienceRequise: d.experienceRequise || undefined,
    description: describeOffer(d),
    rawText: d.texte || undefined,
    source: { name: 'entreprise', externalId: String(_id) },
    siretCheck: { status: company.siretCheck.status, checkedAt: company.siretCheck.checkedAt },
    analysis: {
      status: 'en_attente',
      criteria: { formation: d.formation || undefined, niveau: d.niveau, competences: d.competences, rythme: d.rythme },
    },
  });

  await verifyOffer(offer, { siretCheck: company.siretCheck });
  res.status(201).json({ offer: toCompanyOffer(offer) });
});

router.get('/offres', async (req, res) => {
  const company = await myCompany(req);
  const offers = await Offer.find({ company: company._id }).sort({ createdAt: -1 }).lean();
  const stats = await Application.aggregate([
    { $match: { offer: { $in: offers.map((o) => o._id) } } },
    {
      $group: {
        _id: '$offer',
        total: { $sum: { $cond: [{ $ne: ['$status', 'retiree'] }, 1, 0] } },
        nouvelles: { $sum: { $cond: [{ $eq: ['$status', 'envoyee'] }, 1, 0] } },
        entretiens: { $sum: { $cond: [{ $eq: ['$status', 'entretien'] }, 1, 0] } },
      },
    },
  ]);
  const byOffer = new Map(stats.map((s) => [String(s._id), s]));
  res.json({
    company: companyPublic(company),
    ai: ai.enabled(),
    items: offers.map((o) => {
      const s = byOffer.get(String(o._id));
      return { ...toCompanyOffer(o), applicants: { total: s?.total || 0, nouvelles: s?.nouvelles || 0, entretiens: s?.entretiens || 0 } };
    }),
  });
});

// --- Les candidats d'une offre ---

const snapshotOf = (app) => app.profileSnapshot || {};

function toApplicant(app) {
  const p = snapshotOf(app);
  return {
    id: app._id,
    status: app.status,
    score: app.score ?? null,
    sentAt: app.createdAt,
    history: app.history?.length ? app.history : [{ status: 'envoyee', at: app.createdAt }],
    profile: {
      formation: p.formation || '',
      niveau: p.niveau || null,
      competences: p.competences || [],
      ville: p.ville || '',
      rythme: p.rythme || '',
    },
  };
}

// Le détail ajoute les coordonnées et le CV : visibles seulement par l'entreprise à qui l'étudiant a postulé
function toApplicantDetail(app) {
  const p = snapshotOf(app);
  const withdrawn = app.status === 'retiree';
  return {
    ...toApplicant(app),
    parcours: { formationPrecedente: p.formationPrecedente || '', diplomeObtenu: p.diplomeObtenu || '' },
    contact: withdrawn ? null : { email: p.email || '', telephone: p.telephone || '', adresse: p.adresse || '' },
    cv: !withdrawn && p.cv?.fileId ? { name: p.cv.originalName, size: p.cv.size } : null,
    cvWebUrl: withdrawn ? '' : p.cvWebUrl || '',
  };
}

// Les candidatures retirées passent en dernier ; sinon, les profils les plus compatibles d'abord
const applicantOrder = (a, b) =>
  (a.status === 'retiree') - (b.status === 'retiree') || (b.score ?? 0) - (a.score ?? 0) || a.createdAt - b.createdAt;

router.get('/offres/:id', async (req, res) => {
  const company = await myCompany(req);
  const offer = await ownOffer(req.params.id, company);
  const apps = await Application.find({ offer: offer._id }).lean();
  res.json({ offer: toCompanyOffer(offer), applicants: apps.sort(applicantOrder).map(toApplicant) });
});

// Clôturer une offre (elle disparaît pour les étudiants) ou la rouvrir
router.patch('/offres/:id', async (req, res) => {
  const { active } = z.object({ active: z.boolean() }).parse(req.body);
  const offer = await ownOffer(req.params.id, await myCompany(req));
  offer.active = active;
  await offer.save();
  res.json({ offer: toCompanyOffer(offer) });
});

// Relancer la vérification d'une offre restée « Analyse en attente »
router.post('/offres/:id/analyse', aiLimiter, async (req, res) => {
  const company = await refreshSiret(await myCompany(req));
  const offer = await ownOffer(req.params.id, company);
  if (offer.analysis?.status === 'analysee' && offer.analysis.badge) throw new HttpError(409, 'Cette offre est déjà vérifiée');
  offer.siretCheck = { status: company.siretCheck.status, checkedAt: company.siretCheck.checkedAt };
  await verifyOffer(offer, { siretCheck: company.siretCheck });
  res.json({ offer: toCompanyOffer(offer) });
});

async function ownApplication(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Candidature introuvable');
  const company = await myCompany(req);
  const app = await Application.findById(req.params.id).populate('offer', 'company title');
  if (!app || String(app.offer?.company) !== String(company._id)) throw new HttpError(404, 'Candidature introuvable');
  return app;
}

function pushStatus(app, status) {
  if (!app.history?.length) app.history = [{ status: 'envoyee', at: app.createdAt }];
  app.status = status;
  app.history.push({ status, at: new Date(), by: 'entreprise' });
}

// Ouvrir une candidature la marque « Vue » : l'étudiant le voit dans son suivi
router.get('/candidatures/:id', async (req, res) => {
  const app = await ownApplication(req);
  if (app.status === 'envoyee') {
    pushStatus(app, 'vue');
    await app.save();
  }
  res.json({ applicant: toApplicantDetail(app) });
});

router.get('/candidatures/:id/cv', async (req, res) => {
  const app = await ownApplication(req);
  const cv = app.profileSnapshot?.cv;
  if (!cv?.fileId || app.status === 'retiree') throw new HttpError(404, 'Aucun CV joint à cette candidature');
  res.type('application/pdf');
  res.attachment(cv.originalName);
  openFile(cv.fileId)
    .on('error', () => res.status(404).end())
    .pipe(res);
});

// La réponse de l'entreprise : entretien, refus ou embauche
router.patch('/candidatures/:id', async (req, res) => {
  const { status } = z.object({ status: z.enum(COMPANY_STATUSES) }).parse(req.body);
  const app = await ownApplication(req);
  if (app.status === 'retiree') throw new HttpError(409, 'Le candidat a retiré sa candidature');
  if (status !== app.status) {
    pushStatus(app, status);
    await app.save();
  }

  // Un entretien obtenu = la North Star : compté une seule fois par candidature, quel que soit l'auteur
  if (status === 'entretien' && !(await Event.exists({ user: app.user, type: 'entretien', 'meta.application': app._id }))) {
    const student = await User.findById(app.user);
    if (student) await trackEvent('entretien', student, { application: app._id, offer: app.offer._id, by: 'entreprise' });
  }

  res.json({ applicant: toApplicantDetail(app) });
});

export default router;

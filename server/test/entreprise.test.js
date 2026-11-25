// Tests de l'espace entreprise et de l'IA, sans aucun appel réel : l'annuaire des entreprises et Claude sont simulés.
// Prérequis : MongoDB lancé (npm run db:up). Lancement : npm test
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = (process.env.MONGO_URI || 'mongodb://localhost:27017/alto').replace(/\/[^/?]+(\?|$)/, '/alto_test$1');
process.env.JWT_SECRET ||= 'secret-de-test';
process.env.SMTP_URL = '';
process.env.ANTHROPIC_API_KEY = ''; // jamais d'appel facturé pendant les tests

const mongoose = (await import('mongoose')).default;
const { connectDb } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');
const { AiRun, Event, Offer } = await import('../src/models/index.js');
const { ai, AiError, cleanFiche } = await import('../src/ai/offerAi.js');
const { badgeFromVerdict } = await import('../src/ai/review.js');
const { sirene } = await import('../src/utils/sirene.js');

let server;
let base;

function client() {
  let cookie = '';
  const call = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    return { status: res.status, data };
  };
  return {
    get: (p) => call('GET', p),
    post: (p, b) => call('POST', p, b),
    put: (p, b) => call('PUT', p, b),
    patch: (p, b) => call('PATCH', p, b),
    upload: async (p, field, content, filename) => {
      const fd = new FormData();
      fd.append(field, new Blob([content], { type: 'application/pdf' }), filename);
      const res = await fetch(base + p, { method: 'POST', headers: { cookie }, body: fd });
      return { status: res.status, data: await res.json() };
    },
    raw: (p) => fetch(base + p, { headers: { cookie } }),
  };
}

// --- Annuaire des entreprises simulé ---
const SIRETS = {
  '12345678900011': { status: 'valide', officialName: 'MAISON LAUZET', city: 'BORDEAUX', activity: '47.91B' },
  '98765432100022': { status: 'valide', officialName: 'GLOBEX', city: 'LYON', activity: '62.01Z' },
  '22222222200044': { status: 'valide', officialName: 'SOCIETE LENTE', city: 'NANTES', activity: '70.22Z' },
  '33333333300055': { status: 'invalide', reason: 'ferme', officialName: 'ANCIENNE SARL' },
};
let annuaireEnPanne = false;
sirene.verify = async (siret) =>
  annuaireEnPanne ? { status: 'non_verifie' } : SIRETS[siret] || { status: 'invalide', reason: 'introuvable' };

// --- Claude simulé ---
const realFormat = ai.format;
const FICHE = {
  exploitable: true,
  titre: 'Chargé·e de marketing digital',
  entreprise: 'Maison Lauzet',
  ville: 'Bordeaux',
  contrat: 'apprentissage',
  duree: '24 mois',
  rythme: '2 j. école / 3 j. entreprise',
  niveau: 'bac+3',
  secteur: 'Marketing',
  missions: ['Animer notre Instagram et notre newsletter', 'Suivre les campagnes Meta et Google Ads'],
  profil: 'Étudiant·e en bac+3 à bac+5 marketing digital.',
  formation: 'Bachelor marketing digital',
  competences: ['Marketing digital', 'Réseaux sociaux'],
  experience: null,
  remuneration: "Selon la grille légale de l'apprentissage",
  manquants: [],
};
const VERIFIEE = {
  verdict: 'verifiee',
  signes: { publiee_par_une_ecole: false, entreprise_non_nommee: false, inscription_obligatoire: false, experience_exigee: false },
  raison: "L'entreprise est nommée et le poste est décrit précisément.",
};
const ECOLE = {
  verdict: 'suspecte',
  signes: { publiee_par_une_ecole: true, entreprise_non_nommee: true, inscription_obligatoire: true, experience_exigee: false },
  raison: 'Aucune entreprise nommée : elle est "communiquée après validation de ton dossier".',
};

let nextVerdict = VERIFIEE;
const checkCalls = [];
ai.enabled = () => true;
ai.format = async () => FICHE;
ai.check = async (input) => {
  checkCalls.push(input);
  if (nextVerdict instanceof Error) throw nextVerdict;
  return nextVerdict;
};

async function company({ email, siret, name }) {
  const c = client();
  const r = await c.post('/api/entreprise/inscription', { email, password: 'motdepasse123', companyName: name, siret });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return c;
}

let n = 0;
async function student() {
  const c = client();
  assert.equal((await c.post('/api/auth/register', { email: `etu${++n}@alto.test`, password: 'motdepasse123' })).status, 201);
  const profil = {
    formation: 'Bachelor marketing digital',
    niveau: 'bac+3',
    competences: ['Marketing digital'],
    ville: 'Bordeaux',
    rythme: '2 j. école / 3 j. entreprise',
    telephone: '06 12 34 56 78',
  };
  assert.equal((await c.put('/api/profile', profil)).status, 200);
  return c;
}

const OFFRE = {
  texte: 'Chargé(e) de marketing digital en alternance – Maison Lauzet, épicerie fine en ligne à Bordeaux…',
  title: 'Chargé·e de marketing digital',
  ville: 'Bordeaux',
  contrat: 'apprentissage',
  duree: '24 mois',
  rythme: '2 j. école / 3 j. entreprise',
  niveau: 'bac+3',
  secteur: 'Marketing',
  missions: ['Animer notre Instagram et notre newsletter'],
  profilRecherche: 'Étudiant·e en marketing digital.',
  formation: 'Bachelor marketing digital',
  competences: ['Marketing digital'],
  remuneration: "Selon la grille légale de l'apprentissage",
};

// Deux entreprises au SIRET contrôlé, créées une fois pour toute la suite
let lauzet;
let globex;

before(async () => {
  await connectDb();
  await mongoose.connection.dropDatabase();
  server = createApp().listen(0);
  base = `http://localhost:${server.address().port}`;
  lauzet = await company({ email: 'rh@lauzet.test', siret: '12345678900011', name: 'Maison Lauzet' });
  globex = await company({ email: 'rh@globex.test', siret: '98765432100022', name: 'Globex' });
});

after(async () => {
  server?.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('inscription entreprise', () => {
  test('un SIRET actif ouvre un espace entreprise', async () => {
    const me = await lauzet.get('/api/auth/me');
    assert.equal(me.data.user.role, 'entreprise');
    const moi = await lauzet.get('/api/entreprise/moi');
    assert.equal(moi.data.company.name, 'Maison Lauzet');
    assert.equal(moi.data.company.siretCheck.status, 'valide');
    assert.equal(moi.data.company.siretCheck.officialName, 'MAISON LAUZET');
  });

  test('SIRET introuvable, fermé, mal saisi ou déjà inscrit : refusé avec un message clair', async () => {
    const c = client();
    const base = { email: 'x@entreprise.test', password: 'motdepasse123', companyName: 'Société X' };
    let r = await c.post('/api/entreprise/inscription', { ...base, siret: '44444444400066' });
    assert.equal(r.status, 400);
    assert.match(r.data.error, /introuvable/);
    r = await c.post('/api/entreprise/inscription', { ...base, siret: '333 333 333 00055' });
    assert.equal(r.status, 400);
    assert.match(r.data.error, /fermé/);
    r = await c.post('/api/entreprise/inscription', { ...base, siret: '1234' });
    assert.equal(r.status, 400);
    r = await c.post('/api/entreprise/inscription', { ...base, siret: '12345678900011' });
    assert.equal(r.status, 409);
  });

  test("les espaces sont étanches : un étudiant n'entre pas dans l'espace entreprise, une entreprise ne postule pas", async () => {
    const etu = await student();
    assert.equal((await etu.get('/api/entreprise/offres')).status, 403);
    assert.equal((await globex.post('/api/applications', { offerId: new mongoose.Types.ObjectId().toString() })).status, 403);
  });
});

describe("mise en forme par l'IA (appel 1)", () => {
  test("renvoie la fiche sans rien enregistrer", async () => {
    const before = await Offer.countDocuments();
    const r = await lauzet.post('/api/entreprise/offres/mise-en-forme', { texte: 'x'.repeat(120) });
    assert.equal(r.status, 200);
    assert.equal(r.data.fiche.titre, FICHE.titre);
    assert.equal(await Offer.countDocuments(), before);
  });

  test('annonce trop courte, IA indisponible ou en échec : un message qui invite à remplir la fiche', async () => {
    const short = await lauzet.post('/api/entreprise/offres/mise-en-forme', { texte: 'trop court' });
    assert.equal(short.status, 400);

    ai.enabled = () => false;
    const off = await lauzet.post('/api/entreprise/offres/mise-en-forme', { texte: 'x'.repeat(120) });
    ai.enabled = () => true;
    assert.equal(off.status, 503);

    ai.format = async () => {
      throw new AiError("Délai dépassé : l'IA n'a pas répondu à temps");
    };
    const ko = await lauzet.post('/api/entreprise/offres/mise-en-forme', { texte: 'x'.repeat(120) });
    ai.format = async () => FICHE;
    assert.equal(ko.status, 502);
    assert.match(ko.data.error, /remplissez la fiche/);
  });
});

describe('publication et vérification (appel 2)', () => {
  let ent;
  before(() => {
    ent = lauzet;
  });

  test('une offre vérifiée par l\'IA, d\'une entreprise au SIRET contrôlé, porte le badge « Vérifiée »', async () => {
    nextVerdict = VERIFIEE;
    checkCalls.length = 0;
    const r = await ent.post('/api/entreprise/offres', OFFRE);
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.equal(r.data.offer.badge, 'verifiee');
    assert.equal(r.data.offer.analysisStatus, 'analysee');

    // L'IA reçoit le texte d'origine, l'émetteur avec son SIRET contrôlé, et les champs de la fiche
    const input = checkCalls[0];
    assert.equal(input.rawText, OFFRE.texte);
    assert.equal(input.emitter.siretCheck.status, 'valide');
    assert.equal(input.fiche.titre, OFFRE.title);
    assert.deepEqual(input.fiche.competences, OFFRE.competences);

    // Les étudiants la voient, avec le nom de l'entreprise et sa fiche de poste
    const etu = await student();
    const list = await etu.get('/api/offers');
    const mine = list.data.items.find((o) => o.id === r.data.offer.id);
    assert.equal(mine.emitter.name, 'Maison Lauzet');
    assert.equal(mine.badge, 'verifiee');
    const detail = await etu.get(`/api/offers/${r.data.offer.id}`);
    assert.deepEqual(detail.data.offer.missions, OFFRE.missions);
    assert.equal(detail.data.offer.remuneration, OFFRE.remuneration);
    assert.ok(detail.data.offer.score >= 90, `score ${detail.data.offer.score}`);
  });

  test("une offre d'école déguisée est « Suspecte », avec la raison donnée par l'IA", async () => {
    nextVerdict = ECOLE;
    const r = await ent.post('/api/entreprise/offres', { ...OFFRE, title: 'Assistant marketing' });
    assert.equal(r.data.offer.badge, 'suspecte');
    assert.match(r.data.offer.badgeReason, /communiquée après validation/);
    const saved = await Offer.findById(r.data.offer.id).lean();
    assert.equal(saved.analysis.signs.ecole, true);
    assert.equal(saved.analysis.method, 'ia');
  });

  test('IA en panne : « Analyse en attente », jamais « Vérifiée » ; la relance donne le badge', async () => {
    nextVerdict = new AiError("Service d'IA injoignable");
    const r = await ent.post('/api/entreprise/offres', { ...OFFRE, title: 'Community manager' });
    assert.equal(r.status, 201);
    assert.equal(r.data.offer.badge, null);
    assert.equal(r.data.offer.analysisStatus, 'echec');
    const saved = await Offer.findById(r.data.offer.id).lean();
    assert.equal(saved.analysis.error, "Service d'IA injoignable");
    assert.equal(saved.analysis.attempts, 1);

    nextVerdict = VERIFIEE;
    const retry = await ent.post(`/api/entreprise/offres/${r.data.offer.id}/analyse`);
    assert.equal(retry.status, 200);
    assert.equal(retry.data.offer.badge, 'verifiee');
    assert.equal((await Offer.findById(r.data.offer.id).lean()).analysis.attempts, 2);
    assert.equal((await ent.post(`/api/entreprise/offres/${r.data.offer.id}/analyse`)).status, 409);
  });

  test("annuaire injoignable à l'inscription : pas de « Vérifiée » avant le contrôle du SIRET, refait à la relance", async () => {
    annuaireEnPanne = true;
    const lente = await company({ email: 'rh@lente.test', siret: '22222222200044', name: 'Société lente' });
    assert.equal((await lente.get('/api/entreprise/moi')).data.company.siretCheck.status, 'non_verifie');

    nextVerdict = VERIFIEE;
    const r = await lente.post('/api/entreprise/offres', { ...OFFRE, title: 'Assistant e-commerce' });
    assert.equal(r.status, 201);
    assert.equal(r.data.offer.badge, null);
    assert.match(r.data.offer.badgeReason, /Vérification de l'entreprise en attente/);

    annuaireEnPanne = false;
    const retry = await lente.post(`/api/entreprise/offres/${r.data.offer.id}/analyse`);
    assert.equal(retry.data.offer.badge, 'verifiee');
    assert.equal((await lente.get('/api/entreprise/moi')).data.company.siretCheck.status, 'valide');
  });
});

describe('candidats', () => {
  let ent;
  let offerId;
  let appId;
  before(async () => {
    ent = lauzet;
    nextVerdict = VERIFIEE;
    offerId = (await ent.post('/api/entreprise/offres', { ...OFFRE, title: 'Chef de projet web' })).data.offer.id;
  });

  test("l'entreprise voit le candidat, l'ouvre (« Vue »), propose un entretien : l'étudiant le voit dans son suivi", async () => {
    const etu = await student();
    assert.equal((await etu.upload('/api/profile/cv', 'cv', Buffer.from('%PDF-1.4 cv'), 'mon-cv.pdf')).status, 201);
    const sent = await etu.post('/api/applications', { offerId });
    assert.equal(sent.status, 201);
    appId = sent.data.application.id;

    const list = await ent.get('/api/entreprise/offres');
    const row = list.data.items.find((o) => o.id === offerId);
    assert.deepEqual(row.applicants, { total: 1, nouvelles: 1, entretiens: 0 });

    const detail = await ent.get(`/api/entreprise/offres/${offerId}`);
    assert.equal(detail.data.applicants.length, 1);
    assert.equal(detail.data.applicants[0].contact, undefined, 'pas de coordonnées dans la liste');

    const opened = await ent.get(`/api/entreprise/candidatures/${appId}`);
    assert.equal(opened.data.applicant.status, 'vue');
    assert.equal(opened.data.applicant.contact.telephone, '06 12 34 56 78');
    assert.equal(opened.data.applicant.cv.name, 'mon-cv.pdf');
    const cv = await ent.raw(`/api/entreprise/candidatures/${appId}/cv`);
    assert.equal(cv.status, 200);
    assert.equal(Buffer.from(await cv.arrayBuffer()).toString(), '%PDF-1.4 cv');

    const interview = await ent.patch(`/api/entreprise/candidatures/${appId}`, { status: 'entretien' });
    assert.equal(interview.status, 200);
    await ent.patch(`/api/entreprise/candidatures/${appId}`, { status: 'entretien' });

    const mine = await etu.get('/api/applications');
    const app = mine.data.items[0];
    assert.equal(app.status, 'entretien');
    assert.deepEqual(
      app.history.map((h) => [h.status, h.by]),
      [
        ['envoyee', 'etudiant'],
        ['vue', 'entreprise'],
        ['entretien', 'entreprise'],
      ],
    );
    // La North Star : un seul entretien compté
    assert.equal(await Event.countDocuments({ type: 'entretien', 'meta.application': new mongoose.Types.ObjectId(appId) }), 1);
  });

  test("une autre entreprise ne voit ni l'offre ni le candidat", async () => {
    const other = globex;
    assert.equal((await other.get(`/api/entreprise/offres/${offerId}`)).status, 404);
    assert.equal((await other.get(`/api/entreprise/candidatures/${appId}`)).status, 404);
    assert.equal((await other.patch(`/api/entreprise/candidatures/${appId}`, { status: 'refusee' })).status, 404);
  });

  test("une offre clôturée disparaît pour les étudiants, l'entreprise peut la rouvrir", async () => {
    const etu = await student();
    assert.equal((await ent.patch(`/api/entreprise/offres/${offerId}`, { active: false })).data.offer.active, false);
    assert.equal((await etu.get(`/api/offers/${offerId}`)).status, 404);
    await ent.patch(`/api/entreprise/offres/${offerId}`, { active: true });
    assert.equal((await etu.get(`/api/offers/${offerId}`)).status, 200);
  });
});

describe('règles de décision et garde-fous', () => {
  const v = (verdict, signes = {}) => ({
    verdict,
    raison: 'r',
    signes: { publiee_par_une_ecole: false, entreprise_non_nommee: false, inscription_obligatoire: false, experience_exigee: false, ...signes },
  });

  test('un signe de fausse offre l\'emporte sur le verdict', () => {
    assert.equal(badgeFromVerdict(v('verifiee', { inscription_obligatoire: true }), 'valide').badge, 'suspecte');
  });

  test('SIRET introuvable : suspecte ; SIRET pas encore contrôlé : pas de « Vérifiée »', () => {
    assert.equal(badgeFromVerdict(v('verifiee'), 'invalide').badge, 'suspecte');
    assert.equal(badgeFromVerdict(v('verifiee'), 'non_verifie').badge, null);
    assert.equal(badgeFromVerdict(v('verifiee'), 'valide').badge, 'verifiee');
  });

  test("expérience exigée, et annonce trop vague (échec noté pour le recettage)", () => {
    assert.equal(badgeFromVerdict(v('experience_exigee'), 'valide').badge, 'experience_exigee');
    const vague = badgeFromVerdict(v('indetermine'), 'valide');
    assert.equal(vague.badge, null);
    assert.equal(vague.status, 'echec');
  });

  test('la fiche renvoyée par l\'IA est nettoyée : rythme ramené à nos libellés, doublons et longueurs', () => {
    const f = cleanFiche({
      ...FICHE,
      rythme: '2 J. École / 3 j. Entreprise',
      competences: ['React', 'react', ' Excel ', 'x'.repeat(80)],
      niveau: 'bac+9',
      manquants: ['ville', 'inconnu'],
    });
    assert.equal(f.rythme, '2 j. école / 3 j. entreprise');
    assert.deepEqual(f.competences.slice(0, 2), ['React', 'Excel']);
    assert.equal(f.competences[2].length, 40);
    assert.equal(f.niveau, null);
    assert.deepEqual(f.manquants, ['ville']);
  });

  test("une annonce sans rythme, sans ville ni niveau (réponse réelle de l'IA) ne fait pas planter le nettoyage", () => {
    const f = cleanFiche({
      exploitable: false,
      titre: 'Assistant marketing digital',
      entreprise: null,
      ville: null,
      contrat: null,
      duree: null,
      rythme: null,
      niveau: null,
      secteur: null,
      missions: [],
      profil: null,
      formation: null,
      competences: [],
      experience: null,
      remuneration: null,
      manquants: ['entreprise', 'rythme'],
    });
    assert.equal(f.rythme, null);
    assert.equal(f.ville, null);
    assert.equal(f.exploitable, false);
  });

  test("une erreur inattendue pendant la mise en forme donne un message clair, jamais une erreur serveur", async () => {
    ai.format = async () => {
      throw new TypeError("Cannot read properties of null (reading 'toLowerCase')");
    };
    const r = await lauzet.post('/api/entreprise/offres/mise-en-forme', { texte: 'x'.repeat(120) });
    ai.format = async () => FICHE;
    assert.equal(r.status, 502);
    assert.match(r.data.error, /remplissez la fiche/);
  });

  test("sans clé d'API, l'appel échoue proprement et l'échec est noté au journal", async () => {
    await assert.rejects(
      realFormat({ rawText: 'Annonce', emitter: { name: 'X' } }),
      (err) => err instanceof AiError && /ANTHROPIC_API_KEY/.test(err.message),
    );
    const run = await AiRun.findOne({ step: 'mise_en_forme', ok: false }).lean();
    assert.match(run.error, /ANTHROPIC_API_KEY/);
  });
});

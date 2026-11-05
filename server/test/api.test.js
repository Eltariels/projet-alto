// Tests de l'API sur une base dédiée (alto_test), vidée avant et après.
// Prérequis : MongoDB lancé (npm run db:up). Lancement : npm test
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = (process.env.MONGO_URI || 'mongodb://localhost:27017/alto').replace(/\/[^/?]+(\?|$)/, '/alto_test$1');
process.env.JWT_SECRET ||= 'secret-de-test';
// Les tests lisent l'e-mail en mémoire : on n'envoie rien, même si un SMTP est configuré
process.env.SMTP_URL = '';

const mongoose = (await import('mongoose')).default;
const { connectDb } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');
const { Offer, Event } = await import('../src/models/index.js');
const { computeScore } = await import('../src/utils/score.js');
const mailer = await import('../src/utils/mailer.js');

let server;
let base;

// Petit client HTTP qui garde le cookie de session, comme un navigateur
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
    del: (p) => call('DELETE', p),
  };
}

let n = 0;
async function student(profile) {
  const c = client();
  const email = `etudiant${++n}@alto.test`;
  const r = await c.post('/api/auth/register', { email, password: 'motdepasse123' });
  assert.equal(r.status, 201);
  if (profile) assert.equal((await c.put('/api/profile', profile)).status, 200);
  return { c, email };
}

const PROFIL = {
  formation: 'BUT Informatique',
  niveau: 'bac+3',
  competences: ['JS', 'React'],
  ville: 'Lyon',
  rythme: '1 sem. école / 3 sem. entreprise',
};

function offer(title, extra = {}) {
  return {
    title,
    emitter: { name: 'Entreprise test', siret: 'x' },
    ville: 'Lyon',
    secteur: 'Numérique',
    niveau: 'bac+3',
    rythme: PROFIL.rythme,
    description: 'Description',
    source: { name: 'demo', externalId: title },
    analysis: {
      status: 'analysee',
      badge: 'verifiee',
      criteria: { formation: 'BUT Informatique', competences: ['JavaScript', 'React', 'Node.js'] },
    },
    ...extra,
  };
}

let ids;

before(async () => {
  await connectDb();
  await mongoose.connection.dropDatabase();
  const docs = await Offer.insertMany([
    offer('Développeur web'),
    offer('Data analyst', {
      ville: 'Paris',
      secteur: 'Finance',
      niveau: 'bac+5',
      analysis: { status: 'analysee', badge: 'verifiee', criteria: { formation: 'Master data', competences: ['Python', 'SQL'] } },
    }),
    offer('Offre douteuse', { analysis: { status: 'analysee', badge: 'suspecte', criteria: { competences: ['React'] } } }),
    ...Array.from({ length: 11 }, (_, i) =>
      offer(`Commercial ${i + 1}`, {
        secteur: 'Commerce',
        ville: 'Nantes',
        analysis: { status: 'analysee', badge: 'verifiee', criteria: { formation: 'BTS NDRC', competences: ['Vente'] } },
      }),
    ),
  ]);
  ids = Object.fromEntries(docs.map((d) => [d.title, String(d._id)]));
  server = createApp().listen(0);
  base = `http://localhost:${server.address().port}`;
});

after(async () => {
  server?.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('score', () => {
  test('les synonymes de compétences comptent (JS = JavaScript, nodejs = Node.js)', () => {
    const o = offer('x');
    const { score, hint } = computeScore({ ...PROFIL, competences: ['js', 'nodejs'] }, o);
    assert.equal(score, 30 + 20 + 20 + 10 + 10);
    assert.equal(hint, 'Il te manque : React');
  });

  test("les abréviations de formation sont reconnues (« BUT info »)", () => {
    const { matches } = computeScore({ ...PROFIL, formation: 'BUT info' }, offer('x'));
    assert.ok(matches.includes('Correspond à ta formation'));
  });

  test('un profil vide a un score faible mais calculable', () => {
    const { score } = computeScore(null, offer('x'));
    assert.equal(score, 0);
  });
});

describe('authentification', () => {
  test('inscription, puis connexion avec un e-mail en majuscules', async () => {
    const { email } = await student();
    const c = client();
    const r = await c.post('/api/auth/login', { email: email.toUpperCase(), password: 'motdepasse123' });
    assert.equal(r.status, 200);
    assert.equal((await c.get('/api/auth/me')).data.user.email, email);
  });

  test('mauvais mot de passe refusé, e-mail en double refusé', async () => {
    const { email } = await student();
    assert.equal((await client().post('/api/auth/login', { email, password: 'faux' })).status, 401);
    assert.equal((await client().post('/api/auth/register', { email, password: 'motdepasse123' })).status, 409);
  });

  test('les routes protégées demandent une session', async () => {
    assert.equal((await client().get('/api/offers')).status, 401);
  });
});

describe('mot de passe oublié', () => {
  test("même réponse que le compte existe ou non", async () => {
    const r = await client().post('/api/auth/forgot-password', { email: 'inconnu@alto.test' });
    assert.equal(r.status, 200);
  });

  test('le lien reçu permet de changer le mot de passe, une seule fois', async () => {
    const { email } = await student();
    await client().post('/api/auth/forgot-password', { email });
    assert.equal(mailer.lastMail.to, email);
    const token = mailer.lastMail.text.match(/token=([a-f0-9]{64})/)[1];

    const c = client();
    assert.equal((await c.post('/api/auth/reset-password', { token, password: 'nouveaumdp456' })).status, 200);
    assert.equal((await c.get('/api/auth/me')).status, 200, 'connecté après la réinitialisation');
    assert.equal((await client().post('/api/auth/login', { email, password: 'nouveaumdp456' })).status, 200);
    assert.equal((await client().post('/api/auth/login', { email, password: 'motdepasse123' })).status, 401);
    assert.equal((await client().post('/api/auth/reset-password', { token, password: 'autre12345' })).status, 400);
  });
});

describe('profil', () => {
  test("le profil complété n'est compté qu'une fois dans les KPI", async () => {
    const { c, email } = await student(PROFIL);
    await c.put('/api/profile', { ...PROFIL, ville: 'Paris' });
    const me = (await c.get('/api/auth/me')).data.user;
    assert.equal(await Event.countDocuments({ user: me.id, type: 'profil_complete' }), 1, email);
  });

  test('téléphone et lien de CV invalides refusés', async () => {
    const { c } = await student();
    const r = await c.put('/api/profile', { telephone: 'abc', cvWebUrl: 'javascript:alert(1)' });
    assert.equal(r.status, 400);
  });
});

describe('offres', () => {
  test("tri par score, suspecte en dernier, pagination par 10", async () => {
    const { c } = await student(PROFIL);
    const { data } = await c.get('/api/offers');
    assert.equal(data.total, 14);
    assert.equal(data.items.length, 10);
    assert.equal(data.hasMore, true);
    assert.equal(data.items[0].title, 'Développeur web');
    assert.ok(data.items[0].hint === null || typeof data.items[0].hint === 'string');

    const page2 = (await c.get('/api/offers?page=2')).data;
    assert.equal(page2.items.length, 14);
    assert.equal(page2.items.at(-1).badge, 'suspecte');
  });

  test('recherche par mot-clé et filtres', async () => {
    const { c } = await student(PROFIL);
    assert.deepEqual(
      (await c.get('/api/offers?q=data')).data.items.map((o) => o.title),
      ['Data analyst'],
    );
    assert.equal((await c.get('/api/offers?q=python')).data.total, 1, 'recherche dans les compétences demandées');
    assert.equal((await c.get('/api/offers?ville=Nantes')).data.total, 11);
    assert.equal((await c.get('/api/offers?q=%5B')).status, 200, 'caractères spéciaux sans erreur');
  });

  test('favoris : ajout, filtre, retrait', async () => {
    const { c } = await student(PROFIL);
    assert.equal((await c.put(`/api/offers/${ids['Data analyst']}/favori`)).status, 200);
    const fav = (await c.get('/api/offers?favoris=1')).data;
    assert.deepEqual(fav.items.map((o) => o.title), ['Data analyst']);
    assert.equal(fav.items[0].favorite, true);
    await c.del(`/api/offers/${ids['Data analyst']}/favori`);
    assert.equal((await c.get('/api/offers?favoris=1')).data.total, 0);
  });

  test('détail : offres proches, jamais suspectes ni elle-même', async () => {
    const { c } = await student(PROFIL);
    const { data } = await c.get(`/api/offers/${ids['Développeur web']}`);
    assert.ok(data.similar.length <= 3);
    assert.ok(data.similar.every((o) => o.badge !== 'suspecte' && o.id !== ids['Développeur web']));
  });
});

describe('candidatures', () => {
  test('postuler, noter, changer de statut, retirer', async () => {
    const { c } = await student(PROFIL);
    const created = await c.post('/api/applications', { offerId: ids['Développeur web'] });
    assert.equal(created.status, 201);
    const id = created.data.application.id;
    assert.equal((await c.post('/api/applications', { offerId: ids['Développeur web'] })).status, 409);

    let r = await c.patch(`/api/applications/${id}`, { note: 'Relancer jeudi' });
    assert.equal(r.data.application.note, 'Relancer jeudi');

    await c.patch(`/api/applications/${id}`, { status: 'entretien' });
    r = await c.patch(`/api/applications/${id}`, { status: 'retiree' });
    assert.deepEqual(
      r.data.application.history.map((h) => h.status),
      ['envoyee', 'entretien', 'retiree'],
    );
    assert.equal((await c.patch(`/api/applications/${id}`, {})).status, 400);
  });

  test("un étudiant ne peut pas modifier la candidature d'un autre", async () => {
    const a = await student(PROFIL);
    const id = (await a.c.post('/api/applications', { offerId: ids['Data analyst'] })).data.application.id;
    const b = await student(PROFIL);
    assert.equal((await b.c.patch(`/api/applications/${id}`, { status: 'acceptee' })).status, 404);
  });

  test('profil incomplet : candidature refusée', async () => {
    const { c } = await student();
    assert.equal((await c.post('/api/applications', { offerId: ids['Data analyst'] })).status, 400);
  });
});

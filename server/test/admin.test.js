// Tests du back-office : accès réservé aux administrateurs, statistiques de visites et d'inscriptions.
// Prérequis : MongoDB lancé (npm run db:up). Lancement : npm test
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = (process.env.MONGO_URI || 'mongodb://localhost:27017/alto').replace(/\/[^/?]+(\?|$)/, '/alto_test$1');
process.env.JWT_SECRET ||= 'secret-de-test';
process.env.SMTP_URL = '';
process.env.ANTHROPIC_API_KEY = '';

const mongoose = (await import('mongoose')).default;
const { connectDb } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');
const { Promo, School } = await import('../src/models/index.js');
const { setAdmin } = await import('../src/utils/admins.js');
const { sirene } = await import('../src/utils/sirene.js');
const { lastDays, parisDay } = await import('../src/utils/dates.js');

sirene.verify = async () => ({ status: 'valide', officialName: 'GLOBEX', city: 'LYON', activity: '62.01Z' });

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
  return { get: (p) => call('GET', p), post: (p, b) => call('POST', p, b), put: (p, b) => call('PUT', p, b) };
}

const PROFIL = {
  formation: 'BUT Informatique',
  niveau: 'bac+3',
  competences: ['React'],
  ville: 'Lyon',
  rythme: '1 sem. école / 3 sem. entreprise',
};

async function student(email, inviteCode, profile) {
  const c = client();
  const r = await c.post('/api/auth/register', { email, password: 'motdepasse123', inviteCode });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  if (profile) assert.equal((await c.put('/api/profile', profile)).status, 200);
  return c;
}

async function login(email, password) {
  const c = client();
  assert.equal((await c.post('/api/auth/login', { email, password })).status, 200);
  return c;
}

before(async () => {
  await connectDb();
  await mongoose.connection.dropDatabase();
  server = createApp().listen(0);
  base = `http://localhost:${server.address().port}`;
  const school = await School.create({ name: 'ESCEN', city: 'Bordeaux' });
  await Promo.create({ school: school._id, name: 'Contenu 3 : les 3 signes', inviteCode: 'SIGNES' });
  await Promo.create({ school: school._id, name: 'Contenu 1 : interviewés', inviteCode: 'OCTOBRE' });
});

after(async () => {
  server?.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('back-office', () => {
  test('réservé aux administrateurs : 401 sans session, 403 pour un étudiant', async () => {
    assert.equal((await client().get('/api/admin/stats')).status, 401);
    const etu = await student('curieux@alto.test');
    assert.equal((await etu.get('/api/admin/stats')).status, 403);
  });

  test('compte les visites, les étudiants par lien de promo et les entreprises', async () => {
    const visitor = client();
    for (let i = 0; i < 3; i += 1) assert.equal((await visitor.post('/api/stats/visite')).status, 200);

    await student('lea@alto.test', 'SIGNES', PROFIL);
    await student('tom@alto.test', 'SIGNES');
    const entreprise = client();
    const r = await entreprise.post('/api/entreprise/inscription', {
      email: 'rh@globex.test',
      password: 'motdepasse123',
      companyName: 'Globex',
      siret: '98765432100022',
    });
    assert.equal(r.status, 201);

    const created = await setAdmin('admin@alto.test');
    assert.equal(created.status, 'cree');
    assert.ok(created.password.length >= 12);
    const admin = await login('admin@alto.test', created.password);
    assert.equal((await admin.get('/api/auth/me')).data.user.role, 'admin');

    const { status, data } = await admin.get('/api/admin/stats');
    assert.equal(status, 200);
    const today = parisDay();

    assert.equal(data.visits.total, 3);
    assert.equal(data.visits.today, 3);
    assert.equal(data.visits.trackedSince, today);
    assert.deepEqual(
      data.visits.byDay.map((d) => d.day),
      lastDays(30),
    );
    assert.deepEqual(data.visits.byDay.at(-1), { day: today, count: 3 });

    // L'administrateur et l'entreprise ne comptent pas parmi les étudiants (curieux + Léa + Tom)
    assert.equal(data.students.total, 3);
    assert.equal(data.students.today, 3);
    assert.equal(data.students.profilesComplete, 1);
    const signes = data.students.byPromo.find((p) => p.code === 'SIGNES');
    assert.deepEqual(
      { accounts: signes.accounts, profilesComplete: signes.profilesComplete, school: signes.school },
      { accounts: 2, profilesComplete: 1, school: 'ESCEN' },
    );
    assert.equal(data.students.byPromo.find((p) => p.code === 'OCTOBRE').accounts, 0);
    assert.deepEqual(data.students.direct, { accounts: 1, profilesComplete: 0 });

    assert.equal(data.companies.total, 1);
    assert.equal(data.companies.siretVerified, 1);
    assert.equal(data.companies.today, 1);
    assert.deepEqual(data.companies.offers, { total: 0, active: 0 });
  });

  test("nommer ou retirer un administrateur prend effet tout de suite, sans nouvelle connexion", async () => {
    const etu = await student('futur.admin@alto.test');
    assert.equal((await etu.get('/api/admin/stats')).status, 403);

    assert.equal((await setAdmin('Futur.Admin@alto.test')).status, 'promu');
    assert.equal((await etu.get('/api/admin/stats')).status, 200);
    assert.equal((await setAdmin('futur.admin@alto.test')).status, 'deja_admin');

    assert.equal((await setAdmin('futur.admin@alto.test', { remove: true })).status, 'retire');
    assert.equal((await etu.get('/api/admin/stats')).status, 403);
  });

  test("un compte entreprise ne devient pas administrateur ; une adresse invalide est refusée", async () => {
    assert.equal((await setAdmin('rh@globex.test')).status, 'entreprise');
    await assert.rejects(setAdmin('pas-une-adresse'), /Adresse e-mail invalide/);
  });
});

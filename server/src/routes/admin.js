import { Router } from 'express';
import mongoose from 'mongoose';
import { Company, Event, Offer, Promo, User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { lastDays, parisDay } from '../utils/dates.js';

// Back-office : réservé aux comptes administrateurs (rôle donné par `npm run admin`)
const router = Router();

// Le rôle est relu en base à chaque requête : nommer ou retirer un administrateur prend effet tout de suite,
// sans attendre l'expiration du jeton de session
async function requireAdmin(req, res, next) {
  if (!(await User.exists({ _id: req.auth.userId, role: 'admin' }))) {
    throw new HttpError(403, 'Accès réservé aux administrateurs');
  }
  next();
}

router.use(requireAuth, requireAdmin);

const DAYS = 30;
const counters = () => mongoose.connection.db.collection('counters');

router.get('/stats', async (req, res) => {
  const days = lastDays(DAYS);
  // Un jour de marge : le premier jour de la période commence à minuit, heure de Paris
  const since = new Date(Date.now() - (DAYS + 1) * 24 * 60 * 60 * 1000);

  const [visitTotal, visitDays, firstTracked, students, companies, verified, signups, promos, completed, offers] =
    await Promise.all([
      counters().findOne({ _id: 'visites' }),
      counters()
        .find({ _id: { $in: days.map((d) => `visites:${d}`) } })
        .toArray(),
      counters().find({ _id: /^visites:/ }).sort({ _id: 1 }).limit(1).toArray(),
      User.find({ role: 'etudiant' }).select('_id promo').lean(),
      Company.countDocuments(),
      Company.countDocuments({ 'siretCheck.status': 'valide' }),
      User.aggregate([
        { $match: { role: { $in: ['etudiant', 'entreprise'] }, createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Europe/Paris' } },
              role: '$role',
            },
            n: { $sum: 1 },
          },
        },
      ]),
      Promo.find().populate('school', 'name').lean(),
      Event.distinct('user', { type: 'profil_complete' }),
      Offer.aggregate([
        { $match: { 'source.name': 'entreprise' } },
        { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: ['$active', 1, 0] } } } },
      ]),
    ]);

  // Visites jour par jour (le suivi par jour ne remonte pas avant sa mise en place)
  const visitsOn = new Map(visitDays.map((d) => [d._id.slice('visites:'.length), d.count]));
  const visitsByDay = days.map((day) => ({ day, count: visitsOn.get(day) || 0 }));

  // Inscriptions par jour et par type de compte
  const signupsOn = (role) => {
    const map = new Map(signups.filter((s) => s._id.role === role).map((s) => [s._id.day, s.n]));
    return days.map((day) => ({ day, count: map.get(day) || 0 }));
  };
  const today = parisDay();
  const countToday = (list) => list.find((d) => d.day === today)?.count || 0;
  const studentDays = signupsOn('etudiant');
  const companyDays = signupsOn('entreprise');

  // Étudiants par lien de promo (le code d'invitation), avec les profils complétés au moins une fois
  const done = new Set(completed.map(String));
  const byPromoId = new Map();
  for (const s of students) {
    const key = s.promo ? String(s.promo) : 'direct';
    const row = byPromoId.get(key) || { accounts: 0, profilesComplete: 0 };
    row.accounts += 1;
    if (done.has(String(s._id))) row.profilesComplete += 1;
    byPromoId.set(key, row);
  }
  const byPromo = promos
    .map((p) => ({
      code: p.inviteCode,
      name: p.name,
      school: p.school?.name || '',
      ...(byPromoId.get(String(p._id)) || { accounts: 0, profilesComplete: 0 }),
    }))
    .sort((a, b) => b.accounts - a.accounts || a.code.localeCompare(b.code));

  res.json({
    generatedAt: new Date(),
    today,
    visits: {
      total: visitTotal?.count || 0,
      today: countToday(visitsByDay),
      trackedSince: firstTracked[0]?._id.slice('visites:'.length) || null,
      byDay: visitsByDay,
    },
    students: {
      total: students.length,
      profilesComplete: students.filter((s) => done.has(String(s._id))).length,
      today: countToday(studentDays),
      byDay: studentDays,
      byPromo,
      direct: byPromoId.get('direct') || { accounts: 0, profilesComplete: 0 },
    },
    companies: {
      total: companies,
      siretVerified: verified,
      today: countToday(companyDays),
      byDay: companyDays,
      offers: { total: offers[0]?.total || 0, active: offers[0]?.active || 0 },
    },
  });
});

export default router;

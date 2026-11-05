// North Star et KPI, semaine par semaine, à partir des événements datés.
// Usage : npm run kpi          (8 dernières semaines)
//         npm run kpi -- 12    (12 dernières semaines)
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { Event } from '../models/index.js';

const weeks = Math.max(1, Number(process.argv[2]) || 8);
const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000);

const pct = (num, den) => (den ? `${Math.round((num / den) * 100)} %` : '-');

await connectDb();

// Une ligne par semaine (lundi) et par type d'événement, plus le nombre d'étudiants distincts
const rows = await Event.aggregate([
  { $match: { at: { $gte: since } } },
  {
    $group: {
      _id: { week: { $dateTrunc: { date: '$at', unit: 'week', startOfWeek: 'monday' } }, type: '$type' },
      count: { $sum: 1 },
      users: { $addToSet: '$user' },
      viaPromo: { $sum: { $cond: [{ $eq: ['$meta.channel', 'promo'] }, 1, 0] } },
    },
  },
  { $sort: { '_id.week': 1 } },
]);

const byWeek = new Map();
for (const r of rows) {
  const key = r._id.week.toISOString().slice(0, 10);
  if (!byWeek.has(key)) byWeek.set(key, {});
  byWeek.get(key)[r._id.type] = r;
}

const table = [...byWeek.entries()].map(([week, t]) => {
  const n = (type) => t[type]?.count ?? 0;
  return {
    'Semaine du': week,
    Inscriptions: n('inscription'),
    'dont via promo': t.inscription?.viaPromo ?? 0,
    'Profils complétés': n('profil_complete'),
    Candidatures: n('candidature'),
    'Entretiens (NSM)': n('entretien'),
    'Candidatures / étudiant actif': t.candidature ? (n('candidature') / t.candidature.users.length).toFixed(1) : '-',
  };
});

const total = (type) => rows.filter((r) => r._id.type === type).reduce((s, r) => s + r.count, 0);

console.log(`\nALTO : ${weeks} dernières semaines\n`);
if (table.length) console.table(table);
else console.log('Aucun événement sur la période.');

console.log('\nNorth Star : entretiens obtenus =', total('entretien'));
console.log('KPI 1, activation (profils complétés / inscriptions) :', pct(total('profil_complete'), total('inscription')));
console.log('KPI 2, engagement (candidatures par étudiant ayant postulé) :', (() => {
  const users = new Set(rows.filter((r) => r._id.type === 'candidature').flatMap((r) => r.users.map(String)));
  return users.size ? (total('candidature') / users.size).toFixed(1) : '-';
})());
console.log('KPI 3, conversion (entretiens / candidatures) :', pct(total('entretien'), total('candidature')));

await mongoose.disconnect();

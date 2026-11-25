// Bilan de l'IA pour le recettage : appels, échecs, durées, coût, et offres restées « Analyse en attente ».
// Usage : npm run ia:bilan          (30 derniers jours)
//         npm run ia:bilan -- 7     (7 derniers jours)
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { AiRun, Offer } from '../models/index.js';
import { cout, dollars } from './ia-prix.js';

const days = Math.max(1, Number(process.argv[2]) || 30);
const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const date = (d) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

await connectDb();
const runs = await AiRun.find({ at: { $gte: since } }).sort({ at: -1 }).populate('offer', 'title').lean();

console.log(`IA d'ALTO, ${days > 1 ? `${days} derniers jours` : 'dernières 24 h'} : ${runs.length} appel(s).\n`);
let totalUsd = 0;
for (const step of ['mise_en_forme', 'verification']) {
  const list = runs.filter((r) => r.step === step);
  if (!list.length) continue;
  const ok = list.filter((r) => r.ok);
  const usd = ok.reduce((t, r) => t + (cout(r.model, r.inputTokens, r.outputTokens) || 0), 0);
  totalUsd += usd;
  const avg = ok.length ? ok.reduce((t, r) => t + r.durationMs, 0) / ok.length / 1000 : 0;
  console.log(
    `${step.padEnd(14)} ${String(list.length).padStart(4)} appels · ${ok.length} réussis · ${list.length - ok.length} échecs · ` +
      `${avg.toFixed(1).replace('.', ',')} s en moyenne · ${dollars(usd)}`,
  );
}
const verified = runs.filter((r) => r.step === 'verification' && r.ok).length;
console.log(`\nCoût estimé : ${dollars(totalUsd)}${verified ? `, soit ${dollars(totalUsd / verified)} par offre vérifiée` : ''}.`);

const failures = runs.filter((r) => !r.ok).slice(0, 15);
if (failures.length) {
  console.log('\nDerniers échecs :');
  for (const r of failures) console.log(`- ${date(r.at)} · ${r.step} · ${r.error}${r.offer ? ` · « ${r.offer.title} »` : ''}`);
}

const pending = await Offer.find({ 'analysis.method': 'ia', 'analysis.badge': { $exists: false }, active: true })
  .select('title emitter.name analysis')
  .lean();
console.log(`\nOffres en « Analyse en attente » : ${pending.length}`);
for (const o of pending) {
  console.log(`- « ${o.title} » (${o.emitter.name}) · ${o.analysis.error || o.analysis.reason} · ${o.analysis.attempts || 0} essai(s)`);
}
await mongoose.disconnect();

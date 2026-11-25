// Essai réel de l'IA sur six annonces types, dont les deux offres du quiz (contenu 2) et nos trois signes.
// Chaque annonce passe par les deux appels (mise en forme puis vérification) ; on compare le badge obtenu
// au badge attendu, avec la durée, les jetons et le coût. Aucune offre n'est créée ni modifiée.
// Usage : npm run ia:essai            les six annonces (nécessite ANTHROPIC_API_KEY ; coûte une quinzaine de centimes)
//         npm run ia:essai -- A D F   seulement les annonces A, D et F
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { AiRun } from '../models/index.js';
import { ai, AiError } from '../ai/offerAi.js';
import { badgeFromVerdict } from '../ai/review.js';
import { cout, dollars } from './ia-prix.js';

const VALIDE = { status: 'valide', officialName: 'Entreprise vérifiée', activity: '47.91B' };

const ANNONCES = [
  {
    nom: "A · quiz : l'école déguisée",
    attendu: 'suspecte',
    emetteur: { name: 'Avenir Talents Recrutement' },
    texte: `Alternance – Assistant(e) Marketing Digital H/F
Avenir Talents Recrutement · Bordeaux (33) · Alternance · 12 ou 24 mois · Bac à Bac+3 · Dès septembre 2027

LE POSTE
Tu veux te lancer dans le marketing digital ? Nos entreprises partenaires recrutent leurs futurs alternants : réseaux sociaux, création de contenus, campagnes e-mailing.

CE QUE NOUS T'OFFRONS
Une formation diplômante Bachelor Marketing Digital (titre RNCP niveau 6), 100 % financée, et l'accompagnement de nos chargés de relations entreprises.

ENTREPRISE D'ACCUEIL
Communiquée après validation de ton dossier d'admission.

POUR CANDIDATER
Réserve ton entretien d'admission. Frais de dossier : 60 €.`,
  },
  {
    nom: 'B · quiz : la vraie offre',
    attendu: 'verifiee',
    emetteur: { name: 'Maison Lauzet', siret: '12345678900011', siretCheck: VALIDE },
    texte: `Chargé(e) de marketing digital en alternance H/F
Maison Lauzet · épicerie fine en ligne, 18 salariés · Bordeaux (33) · Apprentissage · 24 mois · Bac+3 à Bac+5 · Rentrée septembre 2027

TES MISSIONS
Animer notre Instagram et notre newsletter, suivre nos campagnes Meta et Google Ads, rédiger les fiches produits de notre boutique en ligne.

TON PROFIL
Tu prépares un bac+3 à bac+5 en marketing digital. Une première expérience en projet d'école suffit.

RYTHME ET TUTEUR
3 jours chez nous, 2 jours à l'école de ton choix. Tu es suivi(e) par notre responsable marketing.

RÉMUNÉRATION
Selon la grille légale de l'apprentissage.`,
  },
  {
    nom: 'C · entreprise non nommée',
    attendu: 'suspecte',
    emetteur: { name: 'Talentis Conseil' },
    texte: `Alternant(e) assistant(e) comptable – Lyon
Notre client, une PME reconnue du secteur industriel, recherche son futur alternant comptable pour la rentrée.
Missions : saisie des factures, rapprochements bancaires, préparation des déclarations de TVA.
Le nom de l'entreprise te sera communiqué après ton premier entretien avec notre cabinet.
Profil : BTS Comptabilité et gestion. Rythme : 2 jours en formation, 3 jours en entreprise.`,
  },
  {
    nom: 'D · inscription obligatoire',
    attendu: 'suspecte',
    emetteur: { name: 'Campus Pro Sud' },
    texte: `Commercial(e) en alternance – BTS NDRC – Marseille
Rejoins une entreprise partenaire et deviens commercial(e) terrain : prospection, rendez-vous clients, suivi des ventes.
Pour postuler, inscris-toi d'abord à notre BTS NDRC : dossier en ligne, test d'entrée et entretien de motivation.
Une fois ton inscription validée, nous te présentons nos entreprises partenaires.`,
  },
  {
    nom: 'E · expérience exigée',
    attendu: 'experience_exigee',
    emetteur: { name: 'Hexa Logistique', siret: '98765432100022', siretCheck: VALIDE },
    texte: `Développeur(se) full-stack en alternance – Hexa Logistique – Lyon
Au sein de notre équipe produit, tu développes nos outils de suivi de flotte (React, Node.js, PostgreSQL).
Profil : Master informatique en alternance. 3 ans d'expérience minimum en développement React exigés, autonomie complète attendue dès l'arrivée.
Contrat d'apprentissage de 24 mois, rythme 3 semaines entreprise / 1 semaine école. Rémunération selon la grille légale.`,
  },
  {
    nom: 'F · annonce trop vague',
    attendu: 'en attente',
    emetteur: { name: 'JM' },
    texte: `Cherche alternant motivé et dynamique pour rejoindre une super équipe ! Bonne ambiance garantie. Envoie-nous ton CV, on te recontacte vite. Plusieurs postes possibles selon ton profil.`,
  },
];

const s = (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;

const wanted = process.argv.slice(2).map((a) => a.toUpperCase());
const selection = wanted.length ? ANNONCES.filter((a) => wanted.includes(a.nom[0])) : ANNONCES;
if (!selection.length) {
  console.error(`Aucune annonce ne correspond à « ${wanted.join(' ')} » : choisir parmi A, B, C, D, E et F.`);
  process.exit(1);
}

if (!env.anthropicApiKey) {
  console.error("ANTHROPIC_API_KEY est absente de server/.env : l'essai a besoin d'une clé d'API Claude.");
  process.exit(1);
}

await connectDb();
const started = new Date();
console.log(`Essai de l'IA avec ${env.aiModel} sur ${selection.length} annonce(s)…\n`);

let justes = 0;
for (const a of selection) {
  let obtenu;
  let detail;
  try {
    const fiche = await ai.format({ rawText: a.texte, emitter: a.emetteur, timeout: 120_000, maxRetries: 2 });
    const verdict = await ai.check({ rawText: a.texte, emitter: a.emetteur, fiche, timeout: 120_000, maxRetries: 2 });
    const r = badgeFromVerdict(verdict, a.emetteur.siretCheck?.status);
    obtenu = r.badge || 'en attente';
    detail = [
      verdict.raison,
      !fiche.exploitable && 'Mise en forme : annonce jugée trop vague pour faire une fiche',
      fiche.manquants.length && `Champs manquants : ${fiche.manquants.join(', ')}`,
    ]
      .filter(Boolean)
      .join('\n      ');
  } catch (err) {
    // Un échec de l'IA donne « en attente » ; une erreur de notre code est un bug, jamais un succès
    obtenu = err instanceof AiError ? 'en attente' : 'bug';
    detail = err instanceof AiError ? `Échec de l'IA : ${err.message}` : `Bug : ${err}`;
  }
  const ok = obtenu === a.attendu;
  if (ok) justes += 1;
  console.log(`${ok ? '✓' : '✗'} ${a.nom.padEnd(32)} attendu ${a.attendu.padEnd(18)} obtenu ${obtenu}`);
  console.log(`      ${detail}\n`);
}

const runs = await AiRun.find({ at: { $gte: started } }).lean();
const total = runs.reduce(
  (acc, r) => ({
    ms: acc.ms + (r.durationMs || 0),
    in: acc.in + (r.inputTokens || 0),
    out: acc.out + (r.outputTokens || 0),
    usd: acc.usd + (cout(r.model, r.inputTokens, r.outputTokens) || 0),
  }),
  { ms: 0, in: 0, out: 0, usd: 0 },
);
const byStep = (step) => runs.filter((r) => r.step === step && r.ok);
const avg = (list) => (list.length ? list.reduce((t, r) => t + r.durationMs, 0) / list.length : 0);

console.log(`Résultat : ${justes} badge(s) juste(s) sur ${selection.length}.`);
console.log(
  `Durée moyenne : mise en forme ${s(avg(byStep('mise_en_forme')))}, vérification ${s(avg(byStep('verification')))}.`,
);
console.log(
  `Jetons : ${total.in} en entrée, ${total.out} en sortie. Coût estimé : ${dollars(total.usd)}, soit ${dollars(total.usd / selection.length)} par annonce.`,
);
await mongoose.disconnect();

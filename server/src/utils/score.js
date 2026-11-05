// Score de compatibilité profil / offre, sur 100, calculé à partir des critères de l'offre.
// Aucun appel à l'IA ici : le coût ne dépend pas du nombre d'étudiants.

import { canonicalSkill, normalize } from './skills.js';

export { normalize };

export const WEIGHTS = { formation: 30, niveau: 20, competences: 30, ville: 10, rythme: 10 };

const NIVEAU_RANK = { 'bac+2': 2, 'bac+3': 3, 'bac+4': 4, 'bac+5': 5 };

// Mots qui désignent un type de diplôme, pas un domaine : ils ne suffisent pas à dire que deux formations se ressemblent
const GENERIC = new Set([
  'bts', 'but', 'dut', 'licence', 'pro', 'professionnelle', 'master', 'bachelor', 'mba', 'titre',
  'rncp', 'diplome', 'ecole', 'de', 'des', 'du', 'la', 'le', 'les', 'et', 'en', 'a', 'au', 'aux', 'option', 'parcours',
]);

// Abréviations courantes dans les noms de formation
const FORMATION_ALIASES = {
  info: ['informatique'],
  compta: ['comptabilite'],
  rh: ['ressources', 'humaines'],
  com: ['communication'],
  mkt: ['marketing'],
  sio: ['informatique'],
  ndrc: ['commerce', 'commercial'],
  mco: ['commerce', 'commercial'],
  tc: ['commercialisation', 'commerce'],
  gea: ['gestion'],
};

const tokens = (s) => {
  const words = normalize(s)
    .split(' ')
    .filter((t) => t.length > 1 && !GENERIC.has(t));
  return new Set(words.flatMap((w) => [w, ...(FORMATION_ALIASES[w] || [])]));
};

const niveauLabel = (n) => n?.replace('bac', 'Bac');

export function computeScore(profile, offer) {
  const c = offer.analysis?.criteria || {};
  const p = profile || {};
  const matches = [];
  const missing = [];
  let score = 0;

  // Formation : au moins un mot de domaine en commun (ex. « informatique »)
  if (c.formation) {
    const common = [...tokens(p.formation)].filter((t) => tokens(c.formation).has(t));
    if (common.length) {
      score += WEIGHTS.formation;
      matches.push('Correspond à ta formation');
    } else {
      missing.push(`Formation attendue : ${c.formation}`);
    }
  } else {
    score += WEIGHTS.formation;
  }

  // Niveau : identique = tout, un cran d'écart = moitié
  const want = NIVEAU_RANK[c.niveau || offer.niveau];
  const have = NIVEAU_RANK[p.niveau];
  if (!want) {
    score += WEIGHTS.niveau;
  } else if (have === want) {
    score += WEIGHTS.niveau;
    matches.push(`Niveau ${niveauLabel(p.niveau)}, c'est le tien`);
  } else if (have && Math.abs(have - want) === 1) {
    score += WEIGHTS.niveau / 2;
    missing.push(`Niveau demandé : ${niveauLabel(c.niveau || offer.niveau)} (tu es en ${niveauLabel(p.niveau)})`);
  } else {
    missing.push(`Niveau demandé : ${niveauLabel(c.niveau || offer.niveau)}`);
  }

  // Compétences : part des compétences demandées que l'étudiant a déjà (synonymes compris : JS = JavaScript)
  const required = c.competences || [];
  let hint = null;
  if (required.length) {
    const mine = new Set((p.competences || []).map(canonicalSkill));
    const ok = required.filter((r) => mine.has(canonicalSkill(r)));
    const ko = required.filter((r) => !mine.has(canonicalSkill(r)));
    if (ko.length) hint = `Il te manque : ${ko.join(', ')}`;
    score += Math.round((WEIGHTS.competences * ok.length) / required.length);
    if (ok.length) matches.push(`Tu as ${ok.length} compétence${ok.length > 1 ? 's' : ''} sur ${required.length} : ${ok.join(', ')}`);
    if (ko.length) missing.push(`À renforcer : ${ko.join(', ')}`);
  } else {
    score += WEIGHTS.competences;
  }

  if (offer.ville && normalize(offer.ville) === normalize(p.ville)) {
    score += WEIGHTS.ville;
    matches.push(`Dans ta ville (${offer.ville})`);
  } else if (offer.ville) {
    missing.push(`Située à ${offer.ville}${p.ville ? `, pas à ${p.ville}` : ''}`);
  }

  const rythme = c.rythme || offer.rythme;
  if (rythme && normalize(rythme) === normalize(p.rythme)) {
    score += WEIGHTS.rythme;
    matches.push('Même rythme que ton école');
  } else if (rythme) {
    missing.push(`Rythme proposé : ${rythme}`);
  }

  // Ce qu'on affiche sous la carte dans la liste : les compétences manquantes en priorité
  return { score: Math.min(100, Math.round(score)), matches, missing, hint: hint ?? missing[0] ?? null };
}

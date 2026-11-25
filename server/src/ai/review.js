// Ce qu'on fait de la réponse de l'IA : le badge affiché aux étudiants, et l'enregistrement sur l'offre.

import { env } from '../config/env.js';
import { ai } from './offerAi.js';

const PENDING_REASON = "Analyse en attente : la vérification automatique n'a pas encore pu se faire.";

// Le verdict de l'IA donne le badge, avec deux garde-fous qui ne dépendent pas d'elle :
// un signe de fausse offre l'emporte toujours, et « Vérifiée » exige un SIRET contrôlé.
export function badgeFromVerdict(verdict, siretStatus) {
  const s = verdict.signes;
  const signs = {
    ecole: s.publiee_par_une_ecole,
    entrepriseNonNommee: s.entreprise_non_nommee,
    inscriptionObligatoire: s.inscription_obligatoire,
    experienceExigee: s.experience_exigee,
  };
  const result = { status: 'analysee', signs, reason: verdict.raison };

  if (verdict.verdict === 'suspecte' || signs.ecole || signs.entrepriseNonNommee || signs.inscriptionObligatoire) {
    return { ...result, badge: 'suspecte' };
  }
  if (siretStatus === 'invalide') {
    return {
      ...result,
      badge: 'suspecte',
      reason: "L'entreprise qui publie l'offre est introuvable ou fermée dans l'annuaire des entreprises.",
    };
  }
  if (verdict.verdict === 'experience_exigee' || signs.experienceExigee) return { ...result, badge: 'experience_exigee' };
  if (verdict.verdict === 'verifiee') {
    if (siretStatus === 'valide') return { ...result, badge: 'verifiee' };
    return { ...result, badge: null, reason: "Vérification de l'entreprise en attente." };
  }
  // Annonce trop vague pour trancher : un cas d'échec, gardé pour le recettage
  return {
    ...result,
    status: 'echec',
    badge: null,
    reason: PENDING_REASON,
    error: "Verdict indéterminé : annonce trop vague pour l'IA",
  };
}

// Le texte soumis à l'IA : l'annonce d'origine si on l'a, sinon ce que l'offre contient
export function textOf(offer) {
  if (offer.rawText) return offer.rawText;
  return [
    offer.title,
    [offer.emitter?.name, offer.ville].filter(Boolean).join(' · '),
    offer.description,
    offer.experienceRequise && `Expérience demandée : ${offer.experienceRequise}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

// Les champs déjà structurés de l'offre, dans le vocabulaire de la mise en forme
export function ficheOf(offer) {
  const c = offer.analysis?.criteria || {};
  return {
    titre: offer.title,
    entreprise: offer.emitter?.name || null,
    ville: offer.ville || null,
    contrat: offer.contrat || null,
    duree: offer.duree || null,
    rythme: offer.rythme || c.rythme || null,
    niveau: offer.niveau || c.niveau || null,
    secteur: offer.secteur || null,
    missions: offer.missions || [],
    profil: offer.profilRecherche || null,
    formation: c.formation || null,
    competences: c.competences || [],
    experience: offer.experienceRequise || null,
    remuneration: offer.remuneration || null,
  };
}

// Appel 2 sur une offre enregistrée. Ne lève jamais : en cas d'échec, l'offre reste « Analyse en attente »
// avec la raison de l'échec notée pour le recettage.
export async function verifyOffer(offer, { siretCheck, timeout, maxRetries } = {}) {
  const check = siretCheck || offer.siretCheck;
  const update = {
    'analysis.method': 'ia',
    'analysis.model': env.aiModel,
    'analysis.attempts': (offer.analysis?.attempts || 0) + 1,
    'analysis.analyzedAt': new Date(),
  };
  try {
    const verdict = await ai.check({
      rawText: textOf(offer),
      emitter: { name: offer.emitter?.name, siret: offer.emitter?.siret, siretCheck: check },
      fiche: ficheOf(offer),
      offerId: offer._id,
      companyId: offer.company,
      timeout,
      maxRetries,
    });
    const r = badgeFromVerdict(verdict, check?.status);
    Object.assign(update, {
      'analysis.status': r.status,
      'analysis.badge': r.badge ?? undefined,
      'analysis.reason': r.reason,
      'analysis.signs': r.signs,
      'analysis.error': r.error ?? undefined,
    });
  } catch (err) {
    Object.assign(update, {
      'analysis.status': 'echec',
      'analysis.badge': undefined,
      'analysis.reason': PENDING_REASON,
      'analysis.error': err.message,
    });
  }
  offer.set(update);
  await offer.save();
  return offer;
}

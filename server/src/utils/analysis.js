// Analyse par règles simples : c'est le repli prévu quand l'IA n'est pas disponible,
// et la seule analyse tant qu'elle n'est pas branchée.

const SUSPICIOUS = [
  /non r[ée]mun[ée]r/i,
  /frais (d'inscription|de dossier|de formation)/i,
  /paiement (pr[ée]alable|d'avance)/i,
  /\bwhatsapp\b/i,
  /gains? (rapides?|garantis?)/i,
];

const EXPERIENCE = [
  /(\d+)\s*(?:ans?|années?)\s+(?:d'|de\s+)?exp[ée]rience/i,
  /exp[ée]rience\s+(?:significative|confirm[ée]e|exig[ée]e|indispensable|solide)/i,
  /\bs[ée]nior\b|profil confirm[ée]/i,
];

export function analyzeOffer(offer) {
  const text = [offer.title, offer.description, offer.experienceRequise].filter(Boolean).join(' ');

  if (!offer.emitter?.siret || offer.siretCheck?.status === 'invalide') {
    return { badge: 'suspecte', reason: "L'entreprise qui publie l'offre n'a pas pu être identifiée (SIRET absent ou invalide)." };
  }

  const suspicious = SUSPICIOUS.find((r) => r.test(text));
  if (suspicious) {
    return { badge: 'suspecte', reason: `L'annonce contient un signal d'alerte : « ${text.match(suspicious)[0]} ».` };
  }

  for (const r of EXPERIENCE) {
    const m = text.match(r);
    // « 0 an d'expérience » n'est pas une exigence
    if (m && !(m[1] !== undefined && Number(m[1]) === 0)) {
      return { badge: 'experience_exigee', reason: `L'offre demande « ${m[0]} », ce qu'on ne peut pas attendre d'un alternant.` };
    }
  }

  if (offer.siretCheck?.status !== 'valide') {
    // Sans contrôle Sirene, pas de badge « Vérifiée »
    return { badge: null, reason: 'Vérification de l’entreprise en attente.' };
  }

  return { badge: 'verifiee', reason: "L'entreprise est identifiée et l'offre correspond à une vraie alternance." };
}

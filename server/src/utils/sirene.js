// Contrôle d'un SIRET dans l'annuaire des entreprises de l'État (données INSEE), une API publique sans clé.
// On y apprend si l'établissement existe et s'il est actif, son nom officiel et son activité (code NAF) :
// un code en 85 (enseignement) est un indice d'offre publiée par une école.

const API = 'https://recherche-entreprises.api.gouv.fr/search';

export const cleanSiret = (value) => String(value || '').replace(/[\s.-]/g, '');

async function verifySiret(siret) {
  if (!/^\d{14}$/.test(siret)) return { status: 'invalide', reason: 'format' };
  try {
    const res = await fetch(`${API}?q=${siret}&page=1&per_page=1`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });
    // Annuaire indisponible : on n'invente pas de résultat, on réessaiera
    if (!res.ok) return { status: 'non_verifie' };
    const company = (await res.json()).results?.[0];
    const etab =
      company?.matching_etablissements?.find((e) => e.siret === siret) ||
      (company?.siege?.siret === siret ? company.siege : null);
    if (!etab) return { status: 'invalide', reason: 'introuvable' };
    const found = {
      officialName: company.nom_complet || company.nom_raison_sociale,
      city: etab.libelle_commune,
      activity: etab.activite_principale || company.activite_principale,
    };
    if (etab.etat_administratif !== 'A') return { status: 'invalide', reason: 'ferme', ...found };
    return { status: 'valide', ...found };
  } catch {
    return { status: 'non_verifie' };
  }
}

// Point d'entrée remplaçable dans les tests (aucun appel réseau)
export const sirene = { verify: verifySiret };

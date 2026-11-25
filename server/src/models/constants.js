export const ROLES = ['etudiant', 'ecole', 'entreprise', 'admin'];
export const NIVEAUX = ['bac+2', 'bac+3', 'bac+4', 'bac+5'];
export const BADGES = ['verifiee', 'suspecte', 'experience_exigee'];
export const APPLICATION_STATUSES = ['envoyee', 'vue', 'entretien', 'refusee', 'acceptee', 'retiree'];
// Ce qu'une entreprise peut répondre à une candidature (« vue » est posé quand elle l'ouvre)
export const COMPANY_STATUSES = ['entretien', 'refusee', 'acceptee'];
export const EVENT_TYPES = ['inscription', 'profil_complete', 'candidature', 'entretien'];
export const CONTRATS = ['apprentissage', 'professionnalisation'];
export const SIRET_STATUSES = ['non_verifie', 'valide', 'invalide'];
// Rythmes proposés dans le profil étudiant : l'IA s'y ramène quand l'annonce en décrit un
export const RYTHMES = [
  '2 j. école / 3 j. entreprise',
  '1 sem. école / 3 sem. entreprise',
  '2 sem. école / 2 sem. entreprise',
  '1 mois / 1 mois',
];

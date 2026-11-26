// Chaque espace a sa page d'arrivée : l'accueil pour l'étudiant, ses offres pour l'entreprise,
// le tableau de bord pour l'administrateur
const SPACES = { entreprise: '/entreprise', admin: '/admin' };

export const homeFor = (user) => SPACES[user?.role] || '/';

// Une page protégée demandée avant la connexion n'est rouverte que si elle appartient au bon espace
export function afterLogin(user, from) {
  if (!from) return homeFor(user);
  const owner = Object.keys(SPACES).find((role) => from === SPACES[role] || from.startsWith(`${SPACES[role]}/`)) || 'etudiant';
  return owner === user?.role ? from : homeFor(user);
}

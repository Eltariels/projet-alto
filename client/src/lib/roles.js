// Chaque espace a sa page d'arrivée : l'accueil pour l'étudiant, ses offres publiées pour l'entreprise
export const homeFor = (user) => (user?.role === 'entreprise' ? '/entreprise' : '/');

// Une page protégée demandée avant la connexion n'est rouverte que si elle appartient au bon espace
export function afterLogin(user, from) {
  if (!from) return homeFor(user);
  const companyPage = from.startsWith('/entreprise');
  return companyPage === (user?.role === 'entreprise') ? from : homeFor(user);
}

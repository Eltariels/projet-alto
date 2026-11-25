import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const SESSION_KEY = 'alto_visite_comptee';

// Nombre de visites du site et d'étudiants inscrits, dans le pied de page.
// Une visite = une ouverture du site (onglet) : changer de page ou recharger ne recompte pas.
export default function VisitCounter() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let counted = false;
    try {
      counted = sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      // stockage indisponible (navigation privée stricte) : on se contente de lire le compteur
      counted = true;
    }
    const request = counted ? api.get('/stats') : api.post('/stats/visite');
    request
      .then(({ visits, users }) => {
        setStats({ visits, users });
        if (!counted) {
          try {
            sessionStorage.setItem(SESSION_KEY, '1');
          } catch {
            /* rien à faire */
          }
        }
      })
      .catch(() => setStats(null)); // compteur facultatif : en cas d'erreur, il ne s'affiche pas
  }, []);

  if (!stats) return null;
  const n = (x) => x.toLocaleString('fr-FR');
  return (
    <span className="tabular-nums">
      {n(stats.visits)} visite{stats.visits > 1 ? 's' : ''} · {n(stats.users)} inscrit{stats.users > 1 ? 's' : ''}
    </span>
  );
}

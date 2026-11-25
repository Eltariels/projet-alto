import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const SESSION_KEY = 'alto_visite_comptee';

// Nombre de visites du site, dans le pied de page.
// Une visite = une ouverture du site (onglet) : changer de page ou recharger ne recompte pas.
export default function VisitCounter() {
  const [visits, setVisits] = useState(null);

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
      .then(({ visits: n }) => {
        setVisits(n);
        if (!counted) {
          try {
            sessionStorage.setItem(SESSION_KEY, '1');
          } catch {
            /* rien à faire */
          }
        }
      })
      .catch(() => setVisits(null)); // compteur facultatif : en cas d'erreur, il ne s'affiche pas
  }, []);

  if (visits === null) return null;
  return (
    <span className="tabular-nums">
      {visits.toLocaleString('fr-FR')} visite{visits > 1 ? 's' : ''}
    </span>
  );
}

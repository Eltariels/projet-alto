import { useEffect } from 'react';

const BASE = 'ALTO';

// Titre de l'onglet par page : « Mes candidatures · ALTO »
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : `${BASE} — Ne postule qu'aux vraies offres`;
  }, [title]);
}

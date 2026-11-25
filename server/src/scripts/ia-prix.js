// Tarifs publics de l'API Claude, en dollars par million de jetons (novembre 2026).
// La réflexion du modèle est facturée comme des jetons de sortie.
const PRIX = {
  'claude-opus-5-5': { entree: 4, sortie: 20 },
  'claude-sonnet-5-5': { entree: 2, sortie: 10 },
  'claude-haiku-5-5': { entree: 0.1, sortie: 0.5 },
  'claude-fable-5-2': { entree: 8, sortie: 40 },
};

export function cout(model, inputTokens = 0, outputTokens = 0) {
  const p = PRIX[model] || Object.entries(PRIX).find(([id]) => model?.startsWith(id))?.[1];
  if (!p) return null;
  return (inputTokens * p.entree + outputTokens * p.sortie) / 1e6;
}

export const dollars = (v) => (v == null ? '?' : `${v.toFixed(v < 0.1 ? 4 : 2).replace('.', ',')} $`);

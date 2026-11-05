// Synonymes de compétences : « JS » et « JavaScript » doivent compter comme la même compétence.
// Clé = forme de référence, valeurs = variantes acceptées. Tout est comparé après normalize().

export const normalize = (s = '') =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .trim();

const SYNONYMS = {
  javascript: ['js', 'java script', 'ecmascript', 'es6'],
  typescript: ['ts'],
  'node.js': ['node', 'nodejs', 'node js'],
  react: ['reactjs', 'react.js', 'react js'],
  'react native': ['reactnative', 'react-native'],
  python: ['python3', 'python 3'],
  sql: ['mysql', 'postgresql', 'postgres', 'sql server', 'langage sql'],
  docker: ['conteneurs', 'containers'],
  linux: ['unix', 'debian', 'ubuntu'],
  excel: ['microsoft excel', 'ms excel', 'excel avance', 'tableur'],
  'power bi': ['powerbi', 'power-bi'],
  anglais: ['english', 'anglais courant', 'anglais professionnel', 'anglais b2', 'anglais c1'],
  communication: ['communication orale', 'communication ecrite'],
  'gestion de projet': ['project management', 'gestion projet', 'conduite de projet', 'pilotage de projet'],
  'relation client': ['service client', 'relation clientele', 'relations clients', 'accueil client'],
  vente: ['techniques de vente', 'commerce', 'vente conseil'],
  negociation: ['negociation commerciale'],
  prospection: ['prospection commerciale', 'phoning', 'teleprospection'],
  'marketing digital': ['marketing numerique', 'webmarketing', 'web marketing', 'marketing web', 'growth'],
  comptabilite: ['compta', 'comptabilite generale'],
  'controle de gestion': ['controleur de gestion'],
  recrutement: ['sourcing', 'talent acquisition'],
  'support utilisateur': ['support informatique', 'helpdesk', 'help desk', 'assistance utilisateur', 'support n1'],
};

// variante normalisée -> forme de référence normalisée
const CANONICAL = new Map();
for (const [ref, variants] of Object.entries(SYNONYMS)) {
  const key = normalize(ref);
  CANONICAL.set(key, key);
  for (const v of variants) CANONICAL.set(normalize(v), key);
}

export const canonicalSkill = (skill) => {
  const n = normalize(skill);
  return CANONICAL.get(n) ?? n;
};

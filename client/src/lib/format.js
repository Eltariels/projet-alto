export const niveauLabel = (n) => (n ? n.replace('bac', 'Bac') : '');

const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

export function timeAgo(date) {
  const diff = (new Date(date) - Date.now()) / 1000;
  const units = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, sec] of units) {
    if (Math.abs(diff) >= sec) return rtf.format(Math.round(diff / sec), unit);
  }
  return "à l'instant";
}

// Couleur du score : or au-dessus de 70, bleu au milieu, sourdine en dessous
export function scoreTone(score, badge) {
  // Une offre suspecte n'est jamais présentée comme une bonne piste, quel que soit son score
  if (badge === 'suspecte') return { label: 'À éviter', className: 'text-ruby' };
  if (score >= 70) return { label: 'Très compatible', className: 'text-gold-dark' };
  if (score >= 40) return { label: 'Compatible', className: 'text-azure' };
  return { label: 'Peu compatible', className: 'text-ink-soft' };
}

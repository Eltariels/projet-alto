// Les statistiques se lisent à l'heure française : un jour = un jour à Paris
const PARIS_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// « 2026-11-26 »
export const parisDay = (date = new Date()) => PARIS_DAY.format(date);

// Les n derniers jours, du plus ancien à aujourd'hui
export function lastDays(n, today = new Date()) {
  const days = [];
  for (let i = n - 1; i >= 0; i -= 1) days.push(parisDay(new Date(today.getTime() - i * 24 * 60 * 60 * 1000)));
  return [...new Set(days)];
}

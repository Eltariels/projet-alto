// Statuts d'une candidature, dans l'ordre du parcours
export const STATUSES = [
  { value: 'envoyee', label: 'Envoyée', className: 'bg-azure/10 text-azure ring-azure/25' },
  { value: 'vue', label: 'Vue', className: 'bg-parchment-200 text-ink ring-parchment-300' },
  { value: 'entretien', label: 'Entretien', className: 'bg-emerald/12 text-emerald ring-emerald/30' },
  { value: 'refusee', label: 'Refusée', className: 'bg-ruby/8 text-ruby ring-ruby/25' },
  { value: 'acceptee', label: 'Acceptée', className: 'bg-gold/20 text-gold-dark ring-gold/50' },
  { value: 'retiree', label: 'Retirée', className: 'bg-parchment-200 text-ink-soft ring-parchment-300' },
];

export const statusOf = (value) => STATUSES.find((s) => s.value === value) || STATUSES[0];

export function StatusPill({ status }) {
  const s = statusOf(status);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${s.className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {s.label}
    </span>
  );
}

export const formatDate = (d) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export const formatDateTime = (d) =>
  new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

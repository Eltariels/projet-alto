import { useId } from 'react';

function Diamond({ className = '' }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M10 1 19 10 10 19 1 10Z" fill="currentColor" />
    </svg>
  );
}

// Filet or avec losange central, la signature visuelle d'ALTO
export function Divider({ className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`} aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/70" />
      <Diamond className="h-1.5 w-1.5 text-gold/70" />
      <Diamond className="h-3 w-3 text-gold" />
      <Diamond className="h-1.5 w-1.5 text-gold/70" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/70" />
    </div>
  );
}

export function Eyebrow({ children, tone = 'dark', className = '' }) {
  const color = tone === 'light' ? 'text-gold-light' : 'text-gold-dark';
  return (
    <span className={`eyebrow ${color} ${className}`}>
      <Diamond className="h-2 w-2" />
      {children}
      <Diamond className="h-2 w-2" />
    </span>
  );
}

// Titre de section : sur-titre, titre en Cinzel, filet or, chapeau
export function SectionTitle({ eyebrow, title, lead, tone = 'dark', className = '' }) {
  const light = tone === 'light';
  return (
    <div className={`mx-auto max-w-2xl text-center ${className}`}>
      {eyebrow && <Eyebrow tone={tone}>{eyebrow}</Eyebrow>}
      <h2 className={`mt-3 font-display text-3xl font-bold sm:text-4xl ${light ? 'text-parchment' : 'text-night'}`}>
        {title}
      </h2>
      <Divider className="mx-auto mt-5 max-w-48" />
      {lead && <p className={`mt-5 text-base sm:text-lg ${light ? 'text-parchment/70' : 'text-ink-soft'}`}>{lead}</p>}
    </div>
  );
}

// Équerres dorées dans les quatre coins d'un cadre (parent en position relative)
export function Corners({ className = 'text-gold/70', size = 'h-5 w-5', inset = '0.75rem' }) {
  const path = 'M1 15V5a4 4 0 0 1 4-4h10';
  const positions = [
    { top: inset, left: inset, rotate: 0 },
    { top: inset, right: inset, rotate: 90 },
    { bottom: inset, right: inset, rotate: 180 },
    { bottom: inset, left: inset, rotate: 270 },
  ];
  return positions.map(({ rotate, ...pos }) => (
    <svg
      key={rotate}
      viewBox="0 0 16 16"
      className={`pointer-events-none absolute ${size} ${className}`}
      style={{ ...pos, transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5" cy="5" r="1.2" fill="currentColor" />
    </svg>
  ));
}

export function Logo({ className = '' }) {
  const id = useId();
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ead08a" />
            <stop offset="1" stopColor="#94701f" />
          </linearGradient>
        </defs>
        <path d="M16 1.5 30.5 16 16 30.5 1.5 16Z" fill="none" stroke={`url(#${id})`} strokeWidth="1.6" />
        <path d="M16 5.5 26.5 16 16 26.5 5.5 16Z" fill="none" stroke={`url(#${id})`} strokeWidth="0.8" opacity="0.6" />
        <path d="M16 9 21.5 22h-2.7L16 15.4 13.2 22h-2.7Z" fill={`url(#${id})`} />
      </svg>
      <span className="font-display text-xl font-bold tracking-[0.22em] text-gold-gradient">ALTO</span>
    </span>
  );
}

const BADGES = {
  verifiee: { label: 'Vérifiée', className: 'bg-emerald/10 text-emerald ring-emerald/30' },
  suspecte: { label: 'Suspecte', className: 'bg-ruby/10 text-ruby ring-ruby/30' },
  experience_exigee: { label: 'Expérience exigée', className: 'bg-gold/15 text-gold-dark ring-gold/40' },
  en_attente: { label: 'Analyse en attente', className: 'bg-parchment-200 text-ink-soft ring-parchment-300' },
};

export function Badge({ type }) {
  const b = BADGES[type] || BADGES.en_attente;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${b.className}`}>
      <Diamond className="h-1.5 w-1.5" />
      {b.label}
    </span>
  );
}

export function ScoreRing({ value, size = 64, unit = '/100', label = `Score ${value} sur 100` }) {
  const id = useId();
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ead08a" />
            <stop offset="1" stopColor="#94701f" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-parchment-200" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-display font-bold text-night" style={{ fontSize: size * 0.28 }}>{value}</span>
        <span className="mt-0.5 text-[9px] font-semibold tracking-wide text-ink-soft">{unit}</span>
      </div>
    </div>
  );
}

// Médaillon en losange pour les icônes de fonctionnalités
export function Medallion({ children, tone = 'gold' }) {
  const tones = {
    gold: 'from-gold-light to-gold-dark text-night',
    emerald: 'from-emerald-light to-emerald text-parchment',
    azure: 'from-azure-light to-azure text-parchment',
  };
  return (
    <span className="relative inline-flex h-14 w-14 items-center justify-center">
      <span className={`absolute inset-1.5 rotate-45 rounded-lg bg-gradient-to-br shadow-md ${tones[tone]}`} />
      <span className="absolute inset-0 rotate-45 rounded-xl border border-gold/40" />
      <span className={`relative ${tones[tone].split(' ').pop()}`}>{children}</span>
    </span>
  );
}

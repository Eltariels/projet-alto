import { useState } from 'react';
import { Badge, Corners, Divider, Eyebrow } from './Ornament.jsx';
import { BoltIcon, EyeIcon, EyeOffIcon, GaugeIcon, ShieldIcon, SpinnerIcon } from './Icons.jsx';

const PERKS = [
  { icon: ShieldIcon, title: 'Des offres vérifiées', text: 'Fini les annonces trompeuses.' },
  { icon: GaugeIcon, title: 'Ton score sur 100', text: 'Ce qui correspond, ce qui manque.' },
  { icon: BoltIcon, title: 'Candidature en un clic', text: 'Et un suivi au même endroit.' },
];

// Écran partagé : panneau d'ambiance à gauche (desktop), formulaire sur parchemin à droite
export default function AuthLayout({ eyebrow, title, subtitle, aside, children }) {
  return (
    // Le fond est coupé en deux sur toute la largeur, mais le contenu suit la grille de l'en-tête (max-w-6xl) :
    // tout reste aligné, du portable à l'ultrawide
    <div className="relative min-h-[calc(100svh-4rem)]">
      <div className="bg-night-sky absolute inset-y-0 left-0 hidden w-1/2 overflow-hidden lg:block" aria-hidden="true">
        <div className="stardust absolute inset-0" />
        <svg viewBox="0 0 200 200" className="absolute -bottom-24 -right-24 h-[28rem] w-[28rem] text-gold/10">
          <path d="M100 4 196 100 100 196 4 100Z" fill="none" stroke="currentColor" />
          <path d="M100 28 172 100 100 172 28 100Z" fill="none" stroke="currentColor" />
          <path d="M100 52 148 100 100 148 52 100Z" fill="none" stroke="currentColor" />
        </svg>
      </div>

      <div className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl lg:grid-cols-2">
        <aside className="hidden py-16 pr-12 pl-6 text-parchment lg:flex lg:flex-col lg:justify-center">
          <div className="relative w-full max-w-md">
            <Eyebrow tone="light">ALTO</Eyebrow>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight xl:text-5xl">{aside}</h2>
            <Divider className="mt-6 max-w-48" />

            <ul className="mt-10 space-y-5">
              {PERKS.map(({ icon: Icon, title: t, text }) => (
                <li key={t} className="flex items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/35 bg-gold/10 text-gold-light">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">{t}</span>
                    <span className="block text-sm text-parchment/60">{text}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-12 flex flex-wrap gap-2 rounded-xl border border-gold/15 bg-white/[0.04] p-3">
              {['verifiee', 'experience_exigee', 'suspecte'].map((b) => (
                <span key={b} className="inline-flex rounded-full bg-parchment-100 p-0.5">
                  <Badge type={b} />
                </span>
              ))}
            </div>
          </div>
        </aside>

        <section className="relative flex items-center justify-center px-4 py-10 sm:px-6 sm:py-14 lg:justify-end lg:pl-12">
          <div className="animate-rise w-full max-w-md">
            <div className="card-parchment relative overflow-hidden px-6 pb-8 pt-9 sm:px-9 sm:pb-10 sm:pt-11">
              <div
                className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-dark via-gold-light to-gold-dark"
                aria-hidden="true"
              />
              <Corners className="text-gold/45" size="h-4 w-4" inset="0.6rem" />

              <div className="text-center">
                {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
                <h1 className="mt-3 font-display text-3xl font-bold text-night">{title}</h1>
                {subtitle && <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">{subtitle}</p>}
              </div>
              <Divider className="my-7" />
              {children}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function Field({ label, hint, ...props }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-night">{label}</span>
      <input {...props} className="field mt-1.5" />
      {hint && <span className="mt-1.5 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export function PasswordField({ label, hint, children, ...props }) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOffIcon : EyeIcon;
  return (
    <label className="block">
      <span className="text-sm font-semibold text-night">{label}</span>
      <span className="relative mt-1.5 block">
        <input {...props} type={visible ? 'text' : 'password'} className="field pr-12" />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-1 right-1 flex w-10 items-center justify-center rounded-md text-ink-soft transition hover:bg-parchment-200/60 hover:text-night"
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          <Icon className="h-5 w-5" />
        </button>
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

// Jauge simple : longueur, puis variété des caractères
export function PasswordStrength({ value }) {
  if (!value) return null;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((r) => r.test(value)).length;
  const level = value.length < 8 ? 1 : value.length >= 12 && variety >= 3 ? 3 : variety >= 2 ? 2 : 1;
  const meta = [
    null,
    { label: value.length < 8 ? 'Trop court' : 'Faible', bar: 'bg-ruby', text: 'text-ruby' },
    { label: 'Correct', bar: 'bg-gold', text: 'text-gold-dark' },
    { label: 'Solide', bar: 'bg-emerald', text: 'text-emerald' },
  ][level];
  return (
    <span className="mt-2 flex items-center gap-3" aria-live="polite">
      <span className="flex flex-1 gap-1.5">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= level ? meta.bar : 'bg-parchment-300/70'}`}
          />
        ))}
      </span>
      <span className={`w-20 text-right text-xs font-semibold ${meta.text}`}>{meta.label}</span>
    </span>
  );
}

export function SubmitButton({ loading, children, loadingLabel }) {
  return (
    <button type="submit" disabled={loading} className="btn-gold w-full py-3.5">
      {loading ? (
        <>
          <SpinnerIcon className="h-4 w-4 animate-spin" /> {loadingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function FormError({ children }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-ruby/25 bg-ruby/5 px-3 py-2.5 text-sm text-ruby"
    >
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-ruby" aria-hidden="true" />
      {children}
    </p>
  );
}

import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { usePageTitle } from '../lib/usePageTitle.js';
import { Badge, Corners, Divider, Eyebrow, Medallion, ScoreRing, SectionTitle } from '../components/Ornament.jsx';
import {
  ArrowIcon,
  BoltIcon,
  CheckIcon,
  ClockIcon,
  CrossIcon,
  FileIcon,
  GaugeIcon,
  PhoneIcon,
  ShieldIcon,
} from '../components/Icons.jsx';

const PROOFS = [
  { icon: ClockIcon, text: 'Inscription en 2 minutes' },
  { icon: PhoneIcon, text: 'Pensé pour ton téléphone' },
  { icon: FileIcon, text: 'Rien à ressaisir' },
];

// Les irritants relevés en entretien, face à ce qu'ALTO apporte
const BEFORE = [
  'Tu postules sur cinq plateformes différentes',
  "Des offres « alternance » qui demandent déjà deux ans d'expérience",
  'Tu ne sais pas si ton profil correspond vraiment',
  'Tu perds le fil de tes candidatures',
];
const AFTER = [
  'Toutes les offres réunies au même endroit',
  'Les offres irréalistes signalées avant que tu postules',
  'Un score sur 100, avec ce qui correspond et ce qui manque',
  'Tes candidatures et leur statut sur un seul écran',
];

const FEATURES = [
  {
    icon: ShieldIcon,
    tone: 'emerald',
    title: 'Offres vérifiées',
    text: "Chaque annonce est contrôlée : l'entreprise existe-t-elle, l'offre est-elle réaliste pour un alternant ?",
  },
  {
    icon: GaugeIcon,
    tone: 'azure',
    title: 'Score sur 100',
    text: 'Ta compatibilité avec chaque offre, calculée à partir de ta formation, ton niveau, tes compétences et ton rythme.',
  },
  {
    icon: BoltIcon,
    tone: 'gold',
    title: 'Candidature en un clic',
    text: 'Ton profil part avec ta candidature. Tu passes ton temps à préparer tes entretiens, pas à remplir des formulaires.',
  },
];

const BADGE_GUIDE = [
  {
    type: 'verifiee',
    title: 'Tu peux y aller',
    text: "L'entreprise est bien identifiée et l'offre correspond à une vraie alternance.",
  },
  {
    type: 'experience_exigee',
    title: 'Lis bien avant',
    text: "L'offre demande une expérience qu'on ne peut pas attendre d'un alternant.",
  },
  {
    type: 'suspecte',
    title: 'Méfiance',
    text: 'Émetteur introuvable ou annonce incohérente : ALTO te prévient avant que tu postules.',
  },
];

const STEPS = [
  { n: 'I', title: 'Crée ton profil', text: 'Formation, niveau, compétences, ville et rythme.' },
  { n: 'II', title: 'Découvre tes offres', text: 'Classées de la plus compatible à la moins compatible.' },
  { n: 'III', title: 'Postule en un clic', text: 'Ton profil est envoyé, sans rien ressaisir.' },
  { n: 'IV', title: 'Suis tes candidatures', text: 'Tous les statuts réunis au même endroit.' },
];

// Exemple illustratif : les données sont fictives
function OfferPreview() {
  return (
    <div className="animate-rise relative mx-auto w-full max-w-sm [animation-delay:250ms] lg:mr-0">
      {/* Halo et losange décoratif derrière la carte */}
      <div className="absolute -inset-10 rounded-full bg-gold/10 blur-3xl" aria-hidden="true" />
      <svg viewBox="0 0 200 200" className="absolute -right-16 -top-16 h-72 w-72 text-gold/15" aria-hidden="true">
        <path d="M100 4 196 100 100 196 4 100Z" fill="none" stroke="currentColor" />
        <path d="M100 30 170 100 100 170 30 100Z" fill="none" stroke="currentColor" />
      </svg>

      <div className="animate-float relative">
        <div
          className="absolute inset-0 translate-x-3 -translate-y-4 rotate-3 rounded-2xl border border-gold/25 bg-night-700/80 sm:translate-x-5"
          aria-hidden="true"
        />

        <article className="card-parchment relative p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Badge type="verifiee" />
              <h3 className="mt-3 text-lg font-bold leading-snug text-night">Développeur·se web junior</h3>
              <p className="mt-0.5 text-sm text-ink-soft">Atelier Numérique · Lyon</p>
            </div>
            <ScoreRing value={87} />
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5 text-xs font-medium">
            {['Bac+3', '3 sem. / 1 sem.', 'Numérique'].map((t) => (
              <span key={t} className="rounded-md border border-parchment-300/70 bg-parchment px-2 py-1 text-ink-soft">
                {t}
              </span>
            ))}
          </div>

          <Divider className="my-4" />

          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2.5 text-ink">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald/12 text-emerald">
                <CheckIcon className="h-3.5 w-3.5" />
              </span>
              Correspond à ta formation
            </li>
            <li className="flex items-center gap-2.5 text-ink">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald/12 text-emerald">
                <CheckIcon className="h-3.5 w-3.5" />
              </span>
              Rythme compatible
            </li>
            <li className="flex items-center gap-2.5 text-ink">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ruby/10 text-ruby">
                <CrossIcon className="h-3.5 w-3.5" />
              </span>
              React : à renforcer
            </li>
          </ul>

          <div className="btn-gold pointer-events-none mt-5 w-full text-sm">
            Postuler en un clic <BoltIcon className="h-4 w-4" />
          </div>
        </article>

        {/* Pastilles flottantes */}
        <div className="absolute -top-4 right-24 hidden items-center gap-2 rounded-full border border-emerald/30 bg-parchment-100 px-3 py-1.5 text-xs font-bold text-emerald shadow-lg sm:flex">
          <ShieldIcon className="h-4 w-4" /> SIRET vérifié
        </div>
        <div className="absolute -bottom-4 -left-3 hidden items-center gap-2 rounded-full border border-ruby/25 bg-parchment-100 px-3 py-1.5 text-xs font-bold text-ruby shadow-lg sm:flex lg:-left-8">
          <CrossIcon className="h-3.5 w-3.5" /> 2 offres suspectes écartées
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  // Le lien de promo (/?promo=CODE) est transmis jusqu'à l'inscription
  const [params] = useSearchParams();
  const promo = params.get('promo');
  usePageTitle();
  const { user } = useAuth();

  // Connecté, l'étudiant est renvoyé vers son espace plutôt que vers l'inscription
  const primary = user
    ? { href: '/offres', label: 'Voir mes offres' }
    : { href: promo ? `/inscription?promo=${encodeURIComponent(promo)}` : '/inscription', label: 'Créer mon compte' };
  const secondary = user ? { href: '/candidatures', label: 'Mes candidatures' } : { href: '/connexion', label: "J'ai déjà un compte" };

  return (
    <>
      {/* Héros */}
      <section className="bg-night-sky relative overflow-hidden text-parchment">
        <div className="stardust absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pb-28 lg:pt-20">
          <div>
            <span className="animate-rise inline-flex items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-gold-light">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-light shadow-[0_0_8px_2px_rgb(111_181_146/0.6)]" />
              L'alternance, version fiable
            </span>
            <h1 className="animate-rise mt-6 font-display text-[2.6rem] font-bold leading-[1.08] [animation-delay:80ms] sm:text-6xl lg:text-[4.1rem]">
              Ne postule qu'aux <span className="text-gold-gradient">vraies offres</span>
            </h1>
            <p className="animate-rise mt-6 max-w-xl text-lg leading-relaxed text-parchment/75 [animation-delay:160ms]">
              ALTO vérifie chaque annonce, calcule ta compatibilité sur 100 et t'évite les offres qui exigent déjà
              de l'expérience.
            </p>
            <div className="animate-rise mt-9 flex flex-col gap-3 [animation-delay:240ms] sm:flex-row">
              <Link to={primary.href} className="btn-gold group px-6 py-3.5">
                {primary.label}
                <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link to={secondary.href} className="btn-ghost-light px-6 py-3.5">
                {secondary.label}
              </Link>
            </div>
            <ul className="animate-rise mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-parchment/60 [animation-delay:320ms]">
              {PROOFS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-gold" /> {text}
                </li>
              ))}
            </ul>
          </div>

          <OfferPreview />
        </div>
        <Divider className="absolute inset-x-0 bottom-0 translate-y-1/2 px-4 opacity-80" />
      </section>

      {/* Avant / après */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <SectionTitle
          eyebrow="Le constat"
          title="Chercher une alternance ne devrait pas être une quête"
          lead="On a interrogé des étudiants et des recruteurs. Voilà ce qui revient, et ce qu'ALTO change."
        />

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-parchment-300 bg-parchment-200/40 p-6 sm:p-8">
            <p className="eyebrow text-ink-soft">Aujourd'hui</p>
            <ul className="mt-5 space-y-4">
              {BEFORE.map((t) => (
                <li key={t} className="flex gap-3 text-ink-soft">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ruby/10 text-ruby">
                    <CrossIcon className="h-3.5 w-3.5" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="card-parchment relative overflow-hidden p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald via-gold to-emerald" aria-hidden="true" />
            <p className="eyebrow text-emerald">Avec ALTO</p>
            <ul className="mt-5 space-y-4">
              {AFTER.map((t) => (
                <li key={t} className="flex gap-3 font-medium text-ink">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald/12 text-emerald">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Les trois promesses */}
      <section className="border-y border-parchment-300/70 bg-parchment-200/45">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <SectionTitle
            eyebrow="Trois promesses"
            title="Pourquoi ALTO"
            lead="Moins d'annonces trompeuses, moins de candidatures dans le vide, plus d'entretiens."
          />

          {/* Sous 1024 px, cartes en ligne (médaillon à gauche) : trois colonnes y seraient trop étroites */}
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, tone, title, text }) => (
              <div
                key={title}
                className="card-parchment group relative flex gap-5 p-6 transition duration-300 hover:-translate-y-1 hover:border-gold/60 sm:p-7 lg:flex-col lg:gap-0"
              >
                <span className="shrink-0">
                  <Medallion tone={tone}>
                    <Icon className="h-6 w-6" />
                  </Medallion>
                </span>
                <div>
                  <h3 className="text-xl font-bold text-night lg:mt-6">{title}</h3>
                  <p className="mt-2 leading-relaxed text-ink-soft">{text}</p>
                </div>
                <span
                  className="absolute inset-x-7 bottom-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-gold to-transparent transition-transform duration-500 group-hover:scale-x-100"
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guide des badges */}
      <section className="bg-night-sky relative overflow-hidden text-parchment">
        <div className="stardust absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <SectionTitle
            tone="light"
            eyebrow="Trois badges"
            title="Tu sais à quoi t'attendre avant de postuler"
            lead="Chaque offre porte un badge. Un coup d'œil suffit."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {BADGE_GUIDE.map((b) => (
              <div
                key={b.type}
                className="rounded-2xl border border-gold/15 bg-white/[0.04] p-6 backdrop-blur-sm transition hover:border-gold/40 hover:bg-white/[0.06]"
              >
                <span className="rounded-full bg-parchment-100 p-0.5 inline-flex">
                  <Badge type={b.type} />
                </span>
                <h3 className="mt-5 text-lg font-bold">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-parchment/65">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Étapes */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <SectionTitle eyebrow="En quatre étapes" title="Comment ça marche" />
        <ol className="relative mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <span
            className="absolute left-[12.5%] right-[12.5%] top-7 hidden h-px bg-[repeating-linear-gradient(90deg,var(--color-gold)_0_6px,transparent_6px_12px)] opacity-60 lg:block"
            aria-hidden="true"
          />
          {STEPS.map((s) => (
            <li key={s.n} className="relative text-center">
              <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold bg-night font-display text-lg font-bold text-gold-light shadow-[0_0_0_5px_var(--color-parchment),0_0_0_6px_rgb(201_162_58/0.35)]">
                {s.n}
              </span>
              <h3 className="mt-5 text-lg font-bold text-night">{s.title}</h3>
              <p className="mx-auto mt-1.5 max-w-56 text-sm leading-relaxed text-ink-soft">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Appel final */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:pb-24">
        <div className="bg-night-sky relative overflow-hidden rounded-3xl border border-gold/30 px-6 py-14 text-center text-parchment shadow-[0_30px_60px_-30px_rgb(15_27_51/0.7)] sm:px-12 sm:py-16">
          <div className="stardust absolute inset-0" aria-hidden="true" />
          <div className="absolute inset-2 rounded-[1.25rem] border border-gold/15" aria-hidden="true" />
          <Corners className="text-gold/60" inset="1rem" />
          <div className="relative">
            <Eyebrow tone="light">À toi de jouer</Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
              Ta prochaine alternance <span className="text-gold-gradient">commence ici</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-parchment/70">
              Crée ton profil une fois. ALTO trie les offres pour toi et te dit lesquelles valent le coup.
            </p>
            <Link to={primary.href} className="btn-gold group mt-9 px-7 py-3.5">
              {primary.label}
              <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { niveauLabel, scoreTone, timeAgo } from '../lib/format.js';
import { formatDate, StatusPill } from '../lib/applications.jsx';
import { usePageTitle } from '../lib/usePageTitle.js';
import { PageLoader } from '../components/ProtectedRoute.jsx';
import FavoriteButton from '../components/FavoriteButton.jsx';
import { Badge, Corners, Divider, ScoreRing } from '../components/Ornament.jsx';
import {
  AlertIcon,
  ArrowIcon,
  BoltIcon,
  BriefcaseIcon,
  CalendarIcon,
  CapIcon,
  CheckIcon,
  ClockIcon,
  CrossIcon,
  PinIcon,
  ShieldIcon,
  SpinnerIcon,
} from '../components/Icons.jsx';

const BADGE_CALLOUT = {
  verifiee: { className: 'border-emerald/30 bg-emerald/5 text-emerald', icon: ShieldIcon },
  experience_exigee: { className: 'border-gold/40 bg-gold/10 text-gold-dark', icon: AlertIcon },
  suspecte: { className: 'border-ruby/30 bg-ruby/5 text-ruby', icon: AlertIcon },
};

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold-dark">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{label}</p>
        <p className="font-semibold text-night">{value}</p>
      </div>
    </div>
  );
}

function ApplyPanel({ offer, profileComplete, onApplied }) {
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [justSent, setJustSent] = useState(false);

  async function apply() {
    setError('');
    setSending(true);
    try {
      const { application } = await api.post('/applications', { offerId: offer.id });
      setJustSent(true);
      onApplied({ id: application.id, status: application.status, sentAt: application.sentAt });
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
      setConfirming(false);
    }
  }

  if (offer.application) {
    return (
      <div className={`card-parchment relative overflow-hidden p-5 ${justSent ? 'animate-rise' : ''}`}>
        <div
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald via-gold to-emerald"
          aria-hidden="true"
        />
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald text-parchment shadow-md">
            <CheckIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold text-night">{justSent ? 'Candidature envoyée !' : 'Tu as déjà postulé'}</p>
            <p className="text-xs text-ink-soft">Le {formatDate(offer.application.sentAt)}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-parchment px-3 py-2.5">
          <span className="text-xs font-semibold text-ink-soft">Statut</span>
          <StatusPill status={offer.application.status} />
        </div>
        <Link to="/candidatures" className="btn-ghost-dark mt-4 w-full text-sm">
          Voir mes candidatures <ArrowIcon className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (!profileComplete) {
    return (
      <div className="card-parchment p-5 text-center">
        <p className="text-sm text-ink-soft">Ta candidature part avec ton profil : il doit être complet.</p>
        <Link to="/profil" className="btn-gold mt-4 w-full">
          Compléter mon profil <ArrowIcon className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="card-parchment border-ruby/30 p-5">
        <p className="flex items-start gap-2 text-sm font-semibold text-ruby">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" /> Cette offre est signalée comme suspecte.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          Ne paie jamais de frais et ne communique pas de documents sensibles. Tu veux vraiment postuler ?
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setConfirming(false)} className="btn-ghost-dark py-2.5 text-sm">
            Annuler
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={sending}
            className="rounded-lg border border-ruby/40 bg-ruby/10 px-3 py-2.5 text-sm font-semibold text-ruby transition hover:bg-ruby/15"
          >
            {sending ? 'Envoi…' : 'Postuler quand même'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-parchment p-5">
      <button
        type="button"
        onClick={() => (offer.badge === 'suspecte' ? setConfirming(true) : apply())}
        disabled={sending}
        className="btn-gold w-full py-3.5"
      >
        {sending ? (
          <>
            <SpinnerIcon className="h-4 w-4 animate-spin" /> Envoi de ta candidature…
          </>
        ) : (
          <>
            <BoltIcon className="h-4 w-4" /> Postuler en un clic
          </>
        )}
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-center text-xs font-semibold text-ruby">
          {error}
        </p>
      ) : (
        <p className="mt-3 text-center text-xs text-ink-soft">
          {offer.badge === 'suspecte'
            ? 'Prudence : vérifie cette offre avant toute démarche.'
            : 'Ton profil est envoyé tel quel, sans rien ressaisir.'}
        </p>
      )}
    </div>
  );
}

export default function OfferDetail() {
  const { id } = useParams();
  const { state } = useLocation();
  // Le titre de l'onglet suit l'offre une fois chargée
  const [title, setTitle] = useState('Offre');
  usePageTitle(title);
  const back = state?.back || '/offres';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/offers/${id}`)
      .then((d) => {
        setData(d);
        setTitle(d.offer.title);
      })
      .catch((err) =>
        setError(err.status === 404 ? "Cette offre n'existe pas ou n'est plus disponible." : err.message),
      );
  }, [id]);

  const backLink = (
    <Link
      to={back}
      className="group inline-flex items-center gap-2 text-sm font-semibold text-azure transition hover:text-night"
    >
      <ArrowIcon className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-0.5" /> Toutes les offres
    </Link>
  );

  if (error) {
    return (
      <div>
        {backLink}
        <div className="card-parchment mt-6 px-6 py-14 text-center">
          <p className="font-display text-xl font-bold text-night">Offre introuvable</p>
          <p className="mt-2 text-sm text-ink-soft">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return <PageLoader label="Chargement de l'offre…" />;

  const { offer, profileComplete } = data;
  const tone = scoreTone(offer.score, offer.badge);
  const callout = BADGE_CALLOUT[offer.badge];
  const CalloutIcon = callout?.icon;

  return (
    <div className="animate-rise">
      {backLink}

      {/* Mobile : titre, puis score et « Postuler », puis le détail. Ordinateur : en-tête et détail forment une
          seule carte à gauche, le score reste collé à droite. */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_360px] lg:grid-rows-[auto_1fr] lg:gap-y-0">
        <header className="card-parchment p-6 sm:p-9 lg:col-start-1 lg:row-start-1 lg:rounded-b-none lg:border-b-0 lg:pb-0 lg:shadow-none">
          <div className="flex flex-wrap items-center gap-3">
            <Badge type={offer.badge} />
            <span className="flex items-center gap-1.5 text-xs text-ink-soft">
              <ClockIcon className="h-3.5 w-3.5" /> Publiée {timeAgo(offer.publishedAt)}
            </span>
            <FavoriteButton key={offer.id} offerId={offer.id} initial={offer.favorite} withLabel className="-my-1 ml-auto px-2 py-1" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-night sm:text-4xl">{offer.title}</h1>
          <p className="mt-2 text-lg font-medium text-ink-soft">{offer.emitter.name}</p>

          {callout && (
            <p
              className={`mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${callout.className}`}
            >
              <CalloutIcon className="mt-0.5 h-4 w-4 shrink-0" />
              {offer.badgeReason}
            </p>
          )}
        </header>

        <article className="card-parchment order-last p-6 sm:p-9 lg:order-none lg:col-start-1 lg:row-start-2 lg:rounded-t-none lg:border-t-0 lg:pt-8 lg:shadow-[0_18px_40px_-24px_rgb(15_27_51/0.45)]">
          <div className="grid gap-5 sm:grid-cols-2">
            <Fact icon={PinIcon} label="Ville" value={offer.ville} />
            <Fact icon={BriefcaseIcon} label="Secteur" value={offer.secteur} />
            <Fact icon={CapIcon} label="Niveau" value={niveauLabel(offer.niveau)} />
            <Fact icon={CalendarIcon} label="Rythme" value={offer.rythme} />
          </div>

          <Divider className="my-8" />

          <h2 className="eyebrow text-gold-dark">L'offre</h2>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-ink">{offer.description}</p>

          {offer.experienceRequise && (
            <>
              <h2 className="eyebrow mt-8 text-gold-dark">Expérience demandée</h2>
              <p className="mt-3 leading-relaxed text-ink">{offer.experienceRequise}</p>
            </>
          )}
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="bg-night-sky relative overflow-hidden rounded-2xl border border-gold/25 p-6 text-parchment">
            <div className="stardust absolute inset-0" aria-hidden="true" />
            <Corners className="text-gold/40" size="h-4 w-4" inset="0.6rem" />
            <div className="relative">
              <div className="flex items-center gap-4">
                <span className="rounded-full bg-parchment-100 p-1">
                  <ScoreRing value={offer.score} size={84} />
                </span>
                <div>
                  <p className="eyebrow text-[10px] text-gold-light/80">Ta compatibilité</p>
                  <p className="mt-1 font-display text-xl font-bold">{tone.label}</p>
                </div>
              </div>

              {/* Jauge sur 100 */}
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10" role="presentation">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light transition-[width] duration-700"
                  style={{ width: `${offer.score}%` }}
                />
              </div>

              {offer.matches.length > 0 && (
                <>
                  <p className="eyebrow mt-6 text-[10px] text-emerald-light">Ce qui correspond</p>
                  <ul className="mt-2.5 space-y-2 text-sm">
                    {offer.matches.map((m) => (
                      <li key={m} className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald text-parchment">
                          <CheckIcon className="h-3 w-3" />
                        </span>
                        {m}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {offer.missing.length > 0 && (
                <>
                  <p className="eyebrow mt-6 text-[10px] text-ruby-light">Ce qui manque</p>
                  <ul className="mt-2.5 space-y-2 text-sm text-parchment/80">
                    {offer.missing.map((m) => (
                      <li key={m} className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-ruby-light/50 text-ruby-light">
                          <CrossIcon className="h-3 w-3" />
                        </span>
                        {m}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {!profileComplete && (
                <p className="mt-6 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2.5 text-xs text-gold-light">
                  Score partiel :{' '}
                  <Link to="/profil" className="font-bold underline underline-offset-2">
                    complète ton profil
                  </Link>{' '}
                  pour qu'il soit juste.
                </p>
              )}
            </div>
          </div>

          <ApplyPanel
            offer={offer}
            profileComplete={profileComplete}
            onApplied={(application) => setData((d) => ({ ...d, offer: { ...d.offer, application } }))}
          />
        </aside>
      </div>

      {data.similar?.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold text-night">Offres proches</h2>
          <p className="mt-1 text-sm text-ink-soft">Même secteur ou compétences en commun, triées selon ton profil.</p>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">
            {data.similar.map((o) => (
              <li key={o.id}>
                <Link
                  to={`/offres/${o.id}`}
                  state={{ back }}
                  className="card-parchment group flex h-full items-start gap-4 p-5 transition hover:border-gold/60"
                >
                  <div className="min-w-0 flex-1">
                    <Badge type={o.badge} />
                    <p className="mt-2 font-bold leading-snug text-night group-hover:text-azure">{o.title}</p>
                    <p className="mt-0.5 truncate text-sm text-ink-soft">
                      {o.emitter.name}, {o.ville}
                    </p>
                  </div>
                  <ScoreRing value={o.score} size={52} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

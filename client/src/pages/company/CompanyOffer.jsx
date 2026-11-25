import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { usePageTitle } from '../../lib/usePageTitle.js';
import { niveauLabel, timeAgo } from '../../lib/format.js';
import { formatDate, formatDateTime, StatusPill } from '../../lib/applications.jsx';
import { PageLoader } from '../../components/ProtectedRoute.jsx';
import { Badge, Divider, ScoreRing } from '../../components/Ornament.jsx';
import {
  AlertIcon,
  CalendarIcon,
  CapIcon,
  ChevronIcon,
  ClockIcon,
  FileIcon,
  MailIcon,
  PhoneIcon,
  PinIcon,
  SpinnerIcon,
  UsersIcon,
} from '../../components/Icons.jsx';
import { BackLink, badgeMessage, CONTRAT_LABEL, TONES } from './shared.jsx';

function Fact({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold-dark">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">{label}</p>
        <p className="font-semibold text-night">{value}</p>
      </div>
    </div>
  );
}

function OfferSheet({ offer }) {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-ink">
      {offer.missions.length > 0 && (
        <div>
          <h3 className="eyebrow text-gold-dark">Missions</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {offer.missions.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      {offer.profilRecherche && (
        <div>
          <h3 className="eyebrow text-gold-dark">Profil recherché</h3>
          <p className="mt-2">{offer.profilRecherche}</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {offer.formation && (
          <p>
            <span className="font-semibold text-night">Formation visée : </span>
            {offer.formation}
          </p>
        )}
        {offer.remuneration && (
          <p>
            <span className="font-semibold text-night">Rémunération : </span>
            {offer.remuneration}
          </p>
        )}
        {offer.experienceRequise && (
          <p>
            <span className="font-semibold text-night">Expérience demandée : </span>
            {offer.experienceRequise}
          </p>
        )}
      </div>
      {offer.competences.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {offer.competences.map((c) => (
            <span key={c} className="rounded-md border border-azure/20 bg-azure/8 px-2.5 py-1 text-xs font-semibold text-azure">
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const ACTIONS = [
  { status: 'entretien', label: 'Proposer un entretien', className: 'border-emerald/40 bg-emerald/10 text-emerald hover:bg-emerald/15' },
  { status: 'acceptee', label: 'Recruter', className: 'border-gold/50 bg-gold/15 text-gold-dark hover:bg-gold/25' },
  { status: 'refusee', label: 'Refuser', className: 'border-ruby/30 bg-white text-ruby hover:bg-ruby/5' },
];

function ApplicantCard({ applicant: initial, rank }) {
  const [applicant, setApplicant] = useState(initial);
  const [detail, setDetail] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const p = applicant.profile;
  const withdrawn = applicant.status === 'retiree';

  async function toggle() {
    setOpen((o) => !o);
    if (detail || open) return;
    setBusy('open');
    setError('');
    try {
      // Ouvrir la candidature la marque « Vue » pour l'étudiant
      const { applicant: d } = await api.get(`/entreprise/candidatures/${applicant.id}`);
      setDetail(d);
      setApplicant(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function answer(status) {
    setBusy(status);
    setError('');
    try {
      const { applicant: d } = await api.patch(`/entreprise/candidatures/${applicant.id}`, { status });
      setDetail(d);
      setApplicant(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <li className={`card-parchment overflow-hidden ${withdrawn ? 'opacity-70' : ''}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-white/50 sm:p-6"
      >
        <ScoreRing value={applicant.score ?? 0} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-ink-soft">Candidat·e n° {rank}</span>
            <StatusPill status={applicant.status} />
          </div>
          <p className="mt-1.5 truncate font-semibold text-night">
            {p.formation || 'Formation non précisée'}
            {p.niveau && <span className="font-normal text-ink-soft"> · {niveauLabel(p.niveau)}</span>}
          </p>
          <p className="mt-0.5 truncate text-sm text-ink-soft">
            {[p.ville, p.rythme].filter(Boolean).join(' · ')} · reçue le {formatDate(applicant.sentAt)}
          </p>
        </div>
        {busy === 'open' ? (
          <SpinnerIcon className="h-5 w-5 shrink-0 animate-spin text-gold" />
        ) : (
          <ChevronIcon className={`h-5 w-5 shrink-0 text-azure transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div className="border-t border-parchment-300/70 bg-white/40 p-5 sm:p-6">
          {error && <p className="mb-4 text-sm font-semibold text-ruby">{error}</p>}
          {p.competences.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {p.competences.map((c) => (
                <span key={c} className="rounded-md border border-azure/20 bg-azure/8 px-2.5 py-1 text-xs font-semibold text-azure">
                  {c}
                </span>
              ))}
            </div>
          )}

          {detail && (
            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <div className="space-y-3 text-sm">
                {withdrawn ? (
                  <p className="text-ink-soft">L'étudiant a retiré sa candidature : ses coordonnées ne sont plus visibles.</p>
                ) : (
                  <>
                    <p className="font-bold text-night">Coordonnées</p>
                    <a href={`mailto:${detail.contact.email}`} className="flex items-center gap-2 font-semibold text-azure hover:underline">
                      <MailIcon className="h-4 w-4" /> {detail.contact.email}
                    </a>
                    {detail.contact.telephone && (
                      <a href={`tel:${detail.contact.telephone.replace(/\s/g, '')}`} className="flex items-center gap-2 font-semibold text-azure hover:underline">
                        <PhoneIcon className="h-4 w-4" /> {detail.contact.telephone}
                      </a>
                    )}
                    {detail.contact.adresse && (
                      <p className="flex items-center gap-2 text-ink">
                        <PinIcon className="h-4 w-4 text-gold-dark" /> {detail.contact.adresse}
                      </p>
                    )}
                    {(detail.parcours.formationPrecedente || detail.parcours.diplomeObtenu) && (
                      <p className="text-ink">
                        <span className="font-semibold text-night">Parcours : </span>
                        {[detail.parcours.diplomeObtenu, detail.parcours.formationPrecedente].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {detail.cv && (
                        <a href={`/api/entreprise/candidatures/${applicant.id}/cv`} className="btn-ghost-dark px-3.5 py-2 text-sm">
                          <FileIcon className="h-4 w-4" /> Télécharger le CV
                        </a>
                      )}
                      {detail.cvWebUrl && (
                        <a href={detail.cvWebUrl} target="_blank" rel="noreferrer" className="btn-ghost-dark px-3.5 py-2 text-sm">
                          CV en ligne
                        </a>
                      )}
                      {!detail.cv && !detail.cvWebUrl && <span className="text-ink-soft">Pas de CV joint.</span>}
                    </div>
                  </>
                )}
              </div>

              <div>
                <p className="text-sm font-bold text-night">Suivi</p>
                <ol className="mt-3 space-y-3 border-l border-gold/40 pl-4">
                  {[...applicant.history].reverse().map((h, i) => (
                    <li key={`${h.status}-${h.at}`} className="relative">
                      <span
                        className={`absolute -left-[1.3rem] top-1.5 h-2 w-2 rotate-45 ${i === 0 ? 'bg-gold' : 'bg-parchment-300'}`}
                        aria-hidden="true"
                      />
                      <StatusPill status={h.status} />
                      <p className="mt-1 text-xs text-ink-soft">
                        {formatDateTime(h.at)}
                        {h.by === 'entreprise' ? ' · par vous' : h.by === 'etudiant' ? " · par l'étudiant" : ''}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {detail && !withdrawn && (
            <div className="mt-6 flex flex-wrap gap-2 border-t border-parchment-300/70 pt-5">
              {ACTIONS.filter((a) => a.status !== applicant.status).map((a) => (
                <button
                  key={a.status}
                  type="button"
                  onClick={() => answer(a.status)}
                  disabled={Boolean(busy)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition disabled:opacity-60 ${a.className}`}
                >
                  {busy === a.status && <SpinnerIcon className="h-4 w-4 animate-spin" />}
                  {a.label}
                </button>
              ))}
              <p className="w-full text-xs text-ink-soft">L'étudiant voit votre réponse dans le suivi de ses candidatures.</p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function CompanyOffer() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  usePageTitle(data?.offer.title || 'Offre');

  useEffect(() => {
    api
      .get(`/entreprise/offres/${id}`)
      .then(setData)
      .catch((err) => setError(err.status === 404 ? "Cette offre n'existe pas ou ne vous appartient pas." : err.message));
  }, [id]);

  async function run(kind, request) {
    setBusy(kind);
    setActionError('');
    try {
      const { offer } = await request();
      setData((d) => ({ ...d, offer }));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy('');
    }
  }

  if (error) {
    return (
      <div>
        <BackLink />
        <p className="card-parchment mt-6 px-6 py-14 text-center text-ink-soft">{error}</p>
      </div>
    );
  }
  if (!data) return <PageLoader label="Chargement de l'offre…" />;

  const { offer, applicants } = data;
  const message = badgeMessage(offer);
  const pending = !offer.badge;
  const active = applicants.filter((a) => a.status !== 'retiree').length;

  return (
    <div className="animate-rise">
      <BackLink />

      <header className="card-parchment mt-6 p-6 sm:p-9">
        <div className="flex flex-wrap items-center gap-3">
          <Badge type={offer.badge} />
          {!offer.active && (
            <span className="rounded-full bg-parchment-200 px-2.5 py-1 text-xs font-bold text-ink-soft ring-1 ring-parchment-300">
              Clôturée : invisible pour les étudiants
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs text-ink-soft">
            <ClockIcon className="h-3.5 w-3.5" /> Publiée {timeAgo(offer.publishedAt)}
          </span>
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-night sm:text-4xl">{offer.title}</h1>

        <div className={`mt-6 rounded-xl border px-4 py-3 text-sm ${TONES[message.tone]}`}>
          <p className="flex items-start gap-2 font-semibold">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            {message.text}
          </p>
          {offer.badgeReason && !pending && <p className="mt-1.5 pl-6 opacity-90">Raison : {offer.badgeReason}</p>}
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Fact icon={PinIcon} label="Ville" value={offer.ville} />
          <Fact icon={CapIcon} label="Niveau" value={niveauLabel(offer.niveau)} />
          <Fact icon={CalendarIcon} label="Rythme" value={offer.rythme} />
          <Fact icon={ClockIcon} label="Contrat" value={[CONTRAT_LABEL[offer.contrat], offer.duree].filter(Boolean).join(' · ')} />
        </div>

        <Divider className="my-7" />
        <OfferSheet offer={offer} />

        {actionError && <p className="mt-6 text-sm font-semibold text-ruby">{actionError}</p>}
        <div className="mt-7 flex flex-wrap gap-3 border-t border-parchment-300/70 pt-6">
          {pending && (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => run('analyse', () => api.post(`/entreprise/offres/${offer.id}/analyse`))}
              className="btn-gold px-5 py-2.5 text-sm"
            >
              {busy === 'analyse' ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : null}
              Relancer la vérification
            </button>
          )}
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => run('active', () => api.patch(`/entreprise/offres/${offer.id}`, { active: !offer.active }))}
            className="btn-ghost-dark px-5 py-2.5 text-sm"
          >
            {busy === 'active' ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : null}
            {offer.active ? "Clôturer l'offre" : "Rouvrir l'offre"}
          </button>
        </div>
      </header>

      <section className="mt-12">
        <h2 className="flex items-center gap-3 font-display text-2xl font-bold text-night">
          <UsersIcon className="h-6 w-6 text-gold-dark" />
          Candidats <span className="text-base font-semibold text-ink-soft">({active})</span>
        </h2>
        <p className="mt-1 text-sm text-ink-soft">Classés du profil le plus compatible au moins compatible avec votre offre.</p>

        {applicants.length === 0 ? (
          <p className="card-parchment mt-5 px-6 py-10 text-center text-sm text-ink-soft">
            Pas encore de candidat. Les étudiants dont le profil correspond voient votre offre dans leur liste, classée par
            compatibilité.
          </p>
        ) : (
          <ul className="mt-5 space-y-4">
            {applicants.map((a, i) => (
              <ApplicantCard key={a.id} applicant={a} rank={i + 1} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

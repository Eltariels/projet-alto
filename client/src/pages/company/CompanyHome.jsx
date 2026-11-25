import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePageTitle } from '../../lib/usePageTitle.js';
import { niveauLabel, timeAgo } from '../../lib/format.js';
import { PageLoader } from '../../components/ProtectedRoute.jsx';
import { Badge, Divider, Eyebrow } from '../../components/Ornament.jsx';
import { ArrowIcon, BuildingIcon, ClockIcon, PinIcon, PlusIcon, SparkIcon, UsersIcon } from '../../components/Icons.jsx';
import { formatSiretDisplay, SiretStatus } from './shared.jsx';

function Applicants({ counts }) {
  if (!counts.total) return <span className="text-ink-soft">Pas encore de candidat</span>;
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="font-semibold text-night">
        {counts.total} candidat{counts.total > 1 ? 's' : ''}
      </span>
      {counts.nouvelles > 0 && (
        <span className="rounded-full bg-azure/10 px-2 py-0.5 text-xs font-bold text-azure">
          {counts.nouvelles} nouveau{counts.nouvelles > 1 ? 'x' : ''}
        </span>
      )}
      {counts.entretiens > 0 && (
        <span className="rounded-full bg-emerald/12 px-2 py-0.5 text-xs font-bold text-emerald">
          {counts.entretiens} entretien{counts.entretiens > 1 ? 's' : ''}
        </span>
      )}
    </span>
  );
}

function OfferRow({ offer }) {
  return (
    <li>
      <Link
        to={`/entreprise/offres/${offer.id}`}
        className={`card-parchment group flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:border-gold/60 sm:flex-row sm:items-center sm:p-6 ${
          offer.active ? '' : 'opacity-70'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge type={offer.badge} />
            {!offer.active && (
              <span className="rounded-full bg-parchment-200 px-2.5 py-1 text-xs font-bold text-ink-soft ring-1 ring-parchment-300">
                Clôturée
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-ink-soft">
              <ClockIcon className="h-3.5 w-3.5" /> Publiée {timeAgo(offer.publishedAt)}
            </span>
          </div>
          <h3 className="mt-2.5 font-display text-lg font-bold text-night group-hover:text-azure">{offer.title}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
            <span className="flex items-center gap-1">
              <PinIcon className="h-3.5 w-3.5" /> {offer.ville}
            </span>
            <span>{niveauLabel(offer.niveau)}</span>
            <span>{offer.rythme}</span>
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-parchment-300/70 pt-4 text-sm sm:w-64 sm:shrink-0 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
          <span className="flex items-start gap-2">
            <UsersIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold-dark" />
            <Applicants counts={offer.applicants} />
          </span>
          <ArrowIcon className="h-4 w-4 shrink-0 text-azure transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>
    </li>
  );
}

export default function CompanyHome() {
  usePageTitle('Mes offres');
  const { logout } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/entreprise/offres')
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="card-parchment px-6 py-10 text-center text-ruby">{error}</p>;
  if (!data) return <PageLoader label="Chargement de vos offres…" />;

  const { company, items } = data;
  const open = items.filter((o) => o.active);
  const closed = items.filter((o) => !o.active);

  return (
    <div className="animate-rise">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Espace entreprise</Eyebrow>
          <h1 className="mt-3 flex items-center gap-3 font-display text-3xl font-bold text-night sm:text-4xl">
            <BuildingIcon className="h-8 w-8 shrink-0 text-gold-dark" />
            {company.name}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">SIRET {formatSiretDisplay(company.siret)}</p>
          <p className="mt-1">
            <SiretStatus company={company} />
          </p>
        </div>
        <Link to="/entreprise/offres/nouvelle" className="btn-gold shrink-0 px-6">
          <PlusIcon className="h-4 w-4" /> Publier une offre
        </Link>
      </header>

      <Divider className="my-8" />

      {items.length === 0 ? (
        <div className="card-parchment px-6 py-14 text-center">
          <SparkIcon className="mx-auto h-9 w-9 text-gold-dark" />
          <p className="mt-4 font-display text-xl font-bold text-night">Publiez votre première offre</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
            Collez votre annonce telle que vous l'avez déjà rédigée : l'IA en fait une fiche claire, vous la relisez, puis
            ALTO la vérifie et la montre aux étudiants dont le profil correspond.
          </p>
          <Link to="/entreprise/offres/nouvelle" className="btn-gold mt-7 px-6">
            <PlusIcon className="h-4 w-4" /> Publier une offre
          </Link>
        </div>
      ) : (
        <>
          <h2 className="font-display text-2xl font-bold text-night">
            Mes offres <span className="text-base font-semibold text-ink-soft">({open.length} en ligne)</span>
          </h2>
          <ul className="mt-5 space-y-4">
            {open.map((o) => (
              <OfferRow key={o.id} offer={o} />
            ))}
          </ul>
          {closed.length > 0 && (
            <>
              <h2 className="mt-12 font-display text-xl font-bold text-ink-soft">Offres clôturées</h2>
              <ul className="mt-4 space-y-4">
                {closed.map((o) => (
                  <OfferRow key={o.id} offer={o} />
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <div className="mt-14 flex justify-center">
        <button type="button" onClick={logout} className="btn-ghost-dark px-5 py-2.5 text-sm">
          Me déconnecter
        </button>
      </div>
    </div>
  );
}

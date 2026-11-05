import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { usePageTitle } from '../lib/usePageTitle.js';
import { niveauLabel, scoreTone, timeAgo } from '../lib/format.js';
import { Badge, Eyebrow, ScoreRing } from '../components/Ornament.jsx';
import FavoriteButton from '../components/FavoriteButton.jsx';
import {
  AlertIcon,
  BriefcaseIcon,
  CalendarIcon,
  CapIcon,
  CheckIcon,
  ChevronIcon,
  CrossIcon,
  PinIcon,
  SearchIcon,
  SlidersIcon,
  SpinnerIcon,
  StarIcon,
} from '../components/Icons.jsx';

const FILTERS = [
  { key: 'secteur', label: 'Secteur', all: 'Tous les secteurs' },
  { key: 'ville', label: 'Ville', all: 'Toutes les villes' },
  { key: 'niveau', label: 'Niveau', all: 'Tous les niveaux', format: niveauLabel },
  { key: 'rythme', label: 'Rythme', all: 'Tous les rythmes' },
];

// Paramètres qui changent la liste : y toucher ramène à la première page
const LIST_KEYS = [...FILTERS.map((f) => f.key), 'q', 'tri', 'favoris'];

function FilterSelect({ filter, options, value, onChange }) {
  return (
    <label className="block min-w-0">
      <span className="eyebrow text-[10px] text-ink-soft">{filter.label}</span>
      <span className="relative mt-1 block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          // 16 px sur mobile : en dessous, iOS zoome sur le champ
          className={`field cursor-pointer appearance-none truncate py-2.5 pr-9 text-base sm:text-sm ${value ? 'border-gold/70 font-semibold text-night' : ''}`}
        >
          <option value="">{filter.all}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {filter.format ? filter.format(o) : o}
            </option>
          ))}
        </select>
        <ChevronIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
      </span>
    </label>
  );
}

function OfferCard({ offer, query, onFavorite }) {
  const tone = scoreTone(offer.score, offer.badge);
  const flagged = offer.badge === 'suspecte' || offer.badge === 'experience_exigee';
  return (
    <article
      className={`card-parchment group relative flex gap-4 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-gold/60 sm:gap-6 sm:p-6 ${
        offer.badge === 'suspecte' ? 'opacity-80 hover:opacity-100' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge type={offer.badge} />
          <span className="flex items-center gap-1 text-xs text-ink-soft">
            <CalendarIcon className="h-3.5 w-3.5" /> {timeAgo(offer.publishedAt)}
          </span>
          {offer.application && (
            <span className="flex items-center gap-1 rounded-full bg-night px-2.5 py-1 text-xs font-bold text-gold-light">
              <CheckIcon className="h-3.5 w-3.5" /> Postulé
            </span>
          )}
        </div>
        <h2 className="mt-3 text-lg font-bold leading-snug text-night transition group-hover:text-azure">
          {/* Lien étiré sur toute la carte ; l'étoile reste cliquable au-dessus */}
          <Link
            to={`/offres/${offer.id}`}
            state={{ back: `/offres${query ? `?${query}` : ''}` }}
            className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-gold"
          >
            {offer.title}
          </Link>
        </h2>
        <p className="mt-0.5 text-sm font-medium text-ink-soft">{offer.emitter.name}</p>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink-soft">
          <li className="flex items-center gap-1.5"><PinIcon className="h-4 w-4 text-gold-dark" />{offer.ville}</li>
          <li className="flex items-center gap-1.5"><BriefcaseIcon className="h-4 w-4 text-gold-dark" />{offer.secteur}</li>
          <li className="flex items-center gap-1.5"><CapIcon className="h-4 w-4 text-gold-dark" />{niveauLabel(offer.niveau)}</li>
          <li className="flex items-center gap-1.5 whitespace-nowrap"><CalendarIcon className="h-4 w-4 text-gold-dark" />{offer.rythme}</li>
        </ul>

        {flagged ? (
          <p className={`mt-3 flex items-start gap-2 text-xs leading-relaxed ${offer.badge === 'suspecte' ? 'text-ruby' : 'text-gold-dark'}`}>
            <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" />
            {offer.badgeReason}
          </p>
        ) : (
          offer.hint && (
            // Ce qui manque, visible sans ouvrir l'offre
            <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" aria-hidden="true" />
              {offer.hint}
            </p>
          )
        )}
      </div>

      <div className="flex shrink-0 flex-col items-center">
        <ScoreRing value={offer.score} size={68} />
        <span className={`mt-2 hidden text-center text-[11px] font-bold sm:block ${tone.className}`}>{tone.label}</span>
        {/* Au-dessus du lien étiré de la carte pour rester cliquable */}
        <FavoriteButton
          offerId={offer.id}
          initial={offer.favorite}
          onChange={(on) => onFavorite(offer.id, on)}
          className="relative z-10 mt-auto p-1.5"
        />
      </div>

    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="card-parchment flex animate-pulse gap-6 p-6" aria-hidden="true">
      <div className="flex-1 space-y-3">
        <div className="h-5 w-24 rounded-full bg-parchment-200" />
        <div className="h-5 w-2/3 rounded bg-parchment-200" />
        <div className="h-4 w-1/3 rounded bg-parchment-200" />
        <div className="h-4 w-3/4 rounded bg-parchment-200" />
      </div>
      <div className="h-16 w-16 rounded-full bg-parchment-200" />
    </div>
  );
}

export default function Offers() {
  usePageTitle("Offres d'alternance");
  const [params, setParams] = useSearchParams();
  // Arrivée depuis « mot de passe oublié » : on confirme le changement
  const passwordReset = useLocation().state?.passwordReset;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState(params.get('q') ?? '');

  const query = params.toString();
  const active = FILTERS.filter((f) => params.get(f.key));
  const favoris = params.get('favoris') === '1';
  const page = Number(params.get('page')) || 1;

  useEffect(() => {
    setLoading(true);
    api
      .get(`/offers${query ? `?${query}` : ''}`)
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [query]);

  function update(changes) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (Object.keys(changes).some((k) => LIST_KEYS.includes(k))) next.delete('page');
    setParams(next, { replace: true });
  }

  // Recherche : on attend que l'étudiant ait fini de taper avant d'interroger le serveur.
  // On ne touche l'URL que si la recherche a vraiment changé (sinon on perdrait la page et l'état de navigation).
  useEffect(() => {
    if (search.trim() === (params.get('q') ?? '')) return;
    const t = setTimeout(() => update({ q: search.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function onFavorite(id, on) {
    setData((d) => ({
      ...d,
      favoritesCount: d.favoritesCount + (on ? 1 : -1),
      // Dans la vue « Mes favoris », une offre retirée disparaît de la liste
      items: favoris && !on ? d.items.filter((o) => o.id !== id) : d.items.map((o) => (o.id === id ? { ...o, favorite: on } : o)),
      total: favoris && !on ? d.total - 1 : d.total,
    }));
  }

  function clearAll() {
    setSearch('');
    setParams(favoris ? { favoris: '1' } : {}, { replace: true });
  }

  const hasCriteria = active.length > 0 || params.get('q');

  return (
    <div className="animate-rise">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Tes offres</Eyebrow>
          <h1 className="mt-3 font-display text-4xl font-bold text-night">Offres d'alternance</h1>
          <p className="mt-2 max-w-xl text-ink-soft">
            Classées de la plus compatible à la moins compatible avec ton profil. Les offres suspectes passent toujours en
            dernier.
          </p>
        </div>
        {data && (
          <p className="shrink-0 text-sm text-ink-soft">
            <span className="font-display text-2xl font-bold text-night">{data.total}</span> offre{data.total > 1 ? 's' : ''}
            {' · '}
            <span className="font-semibold text-emerald">
              {data.verified} vérifiée{data.verified > 1 ? 's' : ''}
            </span>
          </p>
        )}
      </header>

      {passwordReset && (
        <p role="status" className="mt-6 flex items-center gap-2 rounded-xl border border-emerald/30 bg-emerald/5 px-5 py-3 text-sm text-emerald">
          <CheckIcon className="h-4 w-4 shrink-0" /> Ton mot de passe a été changé, tu es connecté.
        </p>
      )}

      {data && !data.profileComplete && (
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-gold/40 bg-gold/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink">
            <span className="font-bold text-night">Ton profil n'est pas complet.</span> Les scores sont calculés avec ce que
            tu as renseigné : complète-le pour qu'ils soient justes.
          </p>
          <Link to="/profil" className="btn-gold shrink-0 px-4 py-2 text-sm">
            Compléter mon profil
          </Link>
        </div>
      )}

      <div className="card-parchment mt-6 space-y-4 p-4 sm:p-5">
        {/* Recherche, tri et favoris */}
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="relative block flex-1">
            <span className="sr-only">Rechercher une offre</span>
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink-soft" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une offre…"
              title="Rechercher par métier, entreprise ou compétence"
              enterKeyHint="search"
              className="field py-2.5 pl-10 pr-10 text-base sm:text-sm [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-soft hover:text-night"
                aria-label="Effacer la recherche"
              >
                <CrossIcon className="h-4 w-4" />
              </button>
            )}
          </label>
          <div className="flex gap-3">
            <label className="relative block flex-1 md:w-48 md:flex-none">
              <span className="sr-only">Trier les offres</span>
              <select
                value={params.get('tri') ?? 'score'}
                onChange={(e) => update({ tri: e.target.value === 'score' ? '' : e.target.value })}
                className="field cursor-pointer appearance-none py-2.5 pr-9 text-base sm:text-sm"
              >
                <option value="score">Compatibilité</option>
                <option value="date">Plus récentes</option>
              </select>
              <ChevronIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            </label>
            <button
              type="button"
              onClick={() => update({ favoris: favoris ? '' : '1' })}
              aria-pressed={favoris}
              className={`flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-semibold transition ${
                favoris
                  ? 'border-gold bg-night text-gold-light'
                  : 'border-parchment-300 bg-white text-ink-soft hover:border-gold/60 hover:text-night'
              }`}
            >
              <StarIcon filled={favoris} className="h-4 w-4" />
              Favoris
              {data?.favoritesCount > 0 && (
                <span className={`rounded-full px-1.5 text-xs ${favoris ? 'bg-gold/20' : 'bg-parchment-200'}`}>
                  {data.favoritesCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filtres : repliables sur mobile */}
        <div className="border-t border-parchment-300/70 pt-4">
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            className="flex w-full items-center justify-between text-sm font-bold text-night sm:hidden"
            aria-expanded={showFilters}
          >
            <span className="flex items-center gap-2">
              <SlidersIcon className="h-4 w-4 text-gold-dark" /> Filtres
              {active.length > 0 && (
                <span className="rounded-full bg-night px-2 py-0.5 text-xs text-gold-light">{active.length}</span>
              )}
            </span>
            <ChevronIcon className={`h-4 w-4 transition ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          <div
            className={`${showFilters ? 'mt-4 grid' : 'hidden'} grid-cols-2 gap-3 sm:mt-0 sm:grid lg:grid-cols-[repeat(4,1fr)_auto] lg:items-end`}
          >
            {FILTERS.map((f) => (
              <FilterSelect
                key={f.key}
                filter={f}
                options={data?.filters[f.key] ?? []}
                value={params.get(f.key) ?? ''}
                onChange={(v) => update({ [f.key]: v })}
              />
            ))}
            <button
              type="button"
              onClick={clearAll}
              disabled={!hasCriteria}
              className="col-span-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-azure transition hover:text-night disabled:hidden lg:col-span-1 lg:disabled:invisible lg:disabled:block"
            >
              Tout effacer
            </button>
          </div>
        </div>
      </div>

      {error && <p className="mt-6 rounded-lg border border-ruby/25 bg-ruby/5 px-4 py-3 text-sm text-ruby">{error}</p>}

      <div className={`mt-6 space-y-4 transition-opacity ${loading && data && page === 1 ? 'opacity-60' : ''}`} aria-busy={loading}>
        {!data && loading && [0, 1, 2].map((i) => <SkeletonCard key={i} />)}

        {data?.items.map((o) => (
          <OfferCard key={o.id} offer={o} query={query} onFavorite={onFavorite} />
        ))}

        {data && data.items.length === 0 && (
          <div className="card-parchment px-6 py-14 text-center">
            {favoris && !hasCriteria ? (
              <>
                <p className="font-display text-xl font-bold text-night">Aucune offre en favori</p>
                <p className="mt-2 text-sm text-ink-soft">
                  Clique sur l'étoile d'une offre pour la mettre de côté et la retrouver ici.
                </p>
                <button type="button" onClick={() => update({ favoris: '' })} className="btn-gold mt-6 text-sm">
                  Voir toutes les offres
                </button>
              </>
            ) : (
              <>
                <p className="font-display text-xl font-bold text-night">Aucune offre ne correspond</p>
                <p className="mt-2 text-sm text-ink-soft">Essaie un autre mot-clé ou retire un filtre.</p>
                <button type="button" onClick={clearAll} className="btn-gold mt-6 text-sm">
                  Tout effacer
                </button>
              </>
            )}
          </div>
        )}

        {data?.hasMore && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => update({ page: String(page + 1) })}
              disabled={loading}
              className="btn-ghost-dark min-w-56"
            >
              {loading ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : null}
              Voir plus d'offres
              <span className="text-sm font-normal text-ink-soft">
                ({data.items.length} sur {data.total})
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

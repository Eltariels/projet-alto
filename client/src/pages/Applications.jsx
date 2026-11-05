import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { usePageTitle } from '../lib/usePageTitle.js';
import { PageLoader } from '../components/ProtectedRoute.jsx';
import { formatDate, formatDateTime, STATUSES, StatusPill, statusOf } from '../lib/applications.jsx';
import { Badge, Corners, Eyebrow, ScoreRing } from '../components/Ornament.jsx';
import { ArrowIcon, CalendarIcon, CheckIcon, ChevronIcon, NoteIcon, PinIcon, SpinnerIcon } from '../components/Icons.jsx';

function Stats({ counts, total }) {
  const stats = [
    { label: 'Envoyées', value: total },
    { label: 'En attente', value: counts.envoyee + counts.vue },
    { label: 'Entretiens', value: counts.entretien, highlight: true },
    { label: 'Acceptées', value: counts.acceptee },
  ];
  return (
    <div className="bg-night-sky relative mt-8 overflow-hidden rounded-2xl border border-gold/25 text-parchment">
      <div className="stardust absolute inset-0" aria-hidden="true" />
      <Corners className="text-gold/35" size="h-4 w-4" inset="0.6rem" />
      <dl className="relative grid grid-cols-2 divide-gold/15 sm:grid-cols-4 sm:divide-x">
        {stats.map((s) => (
          <div key={s.label} className="px-5 py-5 text-center sm:py-6">
            <dt className="eyebrow text-[10px] text-parchment/60">{s.label}</dt>
            <dd className={`mt-1 font-display text-3xl font-bold ${s.highlight ? 'text-gold-gradient' : ''}`}>{s.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function StatusSelect({ value, onChange, saving }) {
  const s = statusOf(value);
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Statut de la candidature</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={saving}
        className={`cursor-pointer appearance-none rounded-full py-1.5 pl-3.5 pr-8 text-base font-bold sm:text-sm ring-1 outline-none transition focus:ring-2 focus:ring-gold ${s.className}`}
      >
        {STATUSES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {saving ? (
        <SpinnerIcon className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <ChevronIcon className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 opacity-70" />
      )}
    </label>
  );
}

function ApplicationRow({ app, onUpdate }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(app.note);
  const [noteSaved, setNoteSaved] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const offer = app.offer;
  const withdrawn = app.status === 'retiree';

  async function save(patch) {
    setError('');
    setSaving(true);
    try {
      await onUpdate(app.id, patch);
      return true;
    } catch (err) {
      setError(err.details?.[0]?.message || err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveNote() {
    if (await save({ note })) setNoteSaved(true);
  }

  const title = offer?.active ? (
    <Link to={`/offres/${offer.id}`} className="transition hover:text-azure">
      {offer.title}
    </Link>
  ) : (
    <span>{offer?.title ?? 'Offre supprimée'}</span>
  );

  return (
    <li
      className={`card-parchment ${app.status === 'entretien' ? 'border-emerald/40' : ''} ${
        app.status === 'refusee' || withdrawn ? 'opacity-75' : ''
      }`}
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <span className="hidden sm:block">
          <ScoreRing value={app.score ?? 0} size={56} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {offer && <Badge type={offer.badge} />}
                {offer && !offer.active && <span className="text-xs font-semibold text-ink-soft">Offre retirée</span>}
              </div>
              <h2 className="mt-2 text-lg font-bold leading-snug text-night">{title}</h2>
            </div>
            {/* Sur mobile, le score se range à côté du titre */}
            <span className="sm:hidden">
              <ScoreRing value={app.score ?? 0} size={52} />
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
            <span>{offer?.emitter.name}</span>
            {offer?.ville && (
              <span className="flex items-center gap-1">
                <PinIcon className="h-3.5 w-3.5 text-gold-dark" />
                {offer.ville}
              </span>
            )}
            <span className="flex items-center gap-1">
              <CalendarIcon className="h-3.5 w-3.5 text-gold-dark" />
              Envoyée le {formatDate(app.sentAt)}
            </span>
          </p>
          {/* Aperçu de la note quand le panneau est fermé */}
          {app.note && !open && (
            <p className="mt-2 line-clamp-1 flex items-center gap-1.5 text-sm italic text-ink-soft">
              <NoteIcon className="h-3.5 w-3.5 shrink-0 not-italic text-gold-dark" />
              {app.note}
            </p>
          )}
          {error && <p className="mt-2 text-xs font-semibold text-ruby">{error}</p>}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-parchment-300/70 pt-4 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
          <StatusSelect value={app.status} onChange={(status) => save({ status })} saving={saving} />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex items-center gap-1 text-sm font-semibold text-azure transition hover:text-night"
          >
            Note et suivi
            <ChevronIcon className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="grid gap-6 border-t border-parchment-300/70 bg-parchment/50 p-5 sm:p-6 md:grid-cols-[1.4fr_1fr]">
          <div>
            <label htmlFor={`note-${app.id}`} className="text-sm font-bold text-night">
              Ta note
            </label>
            <p className="text-xs text-ink-soft">Pour toi seul : l'entreprise ne la voit pas.</p>
            <textarea
              id={`note-${app.id}`}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setNoteSaved(false);
              }}
              maxLength={1000}
              rows={3}
              placeholder="Ex. relancé par mail le 12, entretien jeudi 14 h avec Mme Martin…"
              className="field mt-2 resize-y text-base sm:text-sm"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={saveNote}
                disabled={saving || note === app.note}
                className="btn-gold px-4 py-2 text-sm"
              >
                Enregistrer la note
              </button>
              {noteSaved && note === app.note && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald">
                  <CheckIcon className="h-3.5 w-3.5" /> Enregistrée
                </span>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-night">Historique</p>
            <ol className="mt-3 space-y-3 border-l border-gold/40 pl-4">
              {[...app.history].reverse().map((h, i) => (
                <li key={`${h.status}-${h.at}`} className="relative">
                  <span
                    className={`absolute -left-[1.3rem] top-1.5 h-2 w-2 rotate-45 ${i === 0 ? 'bg-gold' : 'bg-parchment-300'}`}
                    aria-hidden="true"
                  />
                  <StatusPill status={h.status} />
                  <p className="mt-1 text-xs text-ink-soft">{formatDateTime(h.at)}</p>
                </li>
              ))}
            </ol>

            {!withdrawn &&
              (confirmWithdraw ? (
                <div className="mt-5 rounded-lg border border-ruby/25 bg-ruby/5 p-3">
                  <p className="text-sm text-ruby">Retirer cette candidature ? Tu pourras toujours changer d'avis.</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (await save({ status: 'retiree' })) setConfirmWithdraw(false);
                      }}
                      disabled={saving}
                      className="rounded-lg bg-ruby px-3 py-1.5 text-sm font-semibold text-white"
                    >
                      Oui, retirer
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmWithdraw(false)}
                      className="rounded-lg px-3 py-1.5 text-sm font-semibold text-ink-soft hover:text-night"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmWithdraw(true)}
                  className="mt-5 text-sm font-semibold text-ink-soft underline underline-offset-4 transition hover:text-ruby"
                >
                  Retirer ma candidature
                </button>
              ))}
          </div>
        </div>
      )}
    </li>
  );
}

export default function Applications() {
  usePageTitle('Mes candidatures');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api
      .get('/applications')
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  async function update(id, patch) {
    const { application } = await api.patch(`/applications/${id}`, patch);
    setData((d) => {
      const items = d.items.map((a) => (a.id === id ? application : a));
      const counts = Object.fromEntries(STATUSES.map((s) => [s.value, items.filter((i) => i.status === s.value).length]));
      return { ...d, items, counts };
    });
  }

  if (error) return <p className="rounded-lg border border-ruby/25 bg-ruby/5 px-4 py-3 text-sm text-ruby">{error}</p>;
  if (!data) return <PageLoader label="Chargement de tes candidatures…" />;

  const items = filter ? data.items.filter((a) => a.status === filter) : data.items;

  return (
    <div className="animate-rise">
      <header>
        <Eyebrow>Ton suivi</Eyebrow>
        <h1 className="mt-3 font-display text-4xl font-bold text-night">Mes candidatures</h1>
        <p className="mt-2 max-w-xl text-ink-soft">
          Toutes tes candidatures au même endroit. Mets leur statut à jour dès que l'entreprise te répond.
        </p>
      </header>

      {data.total === 0 ? (
        <div className="card-parchment relative mt-8 overflow-hidden px-6 py-16 text-center">
          <Corners className="text-gold/40" size="h-5 w-5" inset="0.75rem" />
          <p className="font-display text-2xl font-bold text-night">Aucune candidature pour l'instant</p>
          <p className="mx-auto mt-2 max-w-sm text-ink-soft">
            Choisis une offre qui te correspond et postule en un clic : elle apparaîtra ici.
          </p>
          <Link to="/offres" className="btn-gold mt-8">
            Voir les offres <ArrowIcon className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          <Stats counts={data.counts} total={data.total} />

          {/* Onglets par statut, défilables sur mobile */}
          <div className="-mx-4 mt-8 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex w-max gap-2" role="tablist" aria-label="Filtrer par statut">
              {[{ value: '', label: 'Toutes' }, ...STATUSES].map((s) => {
                const count = s.value ? data.counts[s.value] : data.total;
                const active = filter === s.value;
                return (
                  <button
                    key={s.value || 'all'}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(s.value)}
                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? 'border-gold bg-night text-gold-light'
                        : 'border-parchment-300 bg-white/70 text-ink-soft hover:border-gold/60 hover:text-night'
                    }`}
                  >
                    {s.label}
                    <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-gold/20' : 'bg-parchment-200'}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <ul className="mt-5 space-y-4">
            {items.map((a) => (
              <ApplicationRow key={a.id} app={a} onUpdate={update} />
            ))}
          </ul>

          {items.length === 0 && (
            <p className="card-parchment mt-5 px-6 py-10 text-center text-ink-soft">
              Aucune candidature avec le statut « {statusOf(filter).label} ».
            </p>
          )}

          <p className="mt-8 text-center text-sm text-ink-soft">
            Envie d'en envoyer d'autres ?{' '}
            <Link to="/offres" className="font-bold text-azure underline-offset-4 hover:text-night hover:underline">
              Voir les offres
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePageTitle } from '../../lib/usePageTitle.js';
import { PageLoader } from '../../components/ProtectedRoute.jsx';
import { Divider, Eyebrow } from '../../components/Ornament.jsx';
import { SpinnerIcon } from '../../components/Icons.jsx';
import ColumnChart, { shortDay } from '../../components/admin/ColumnChart.jsx';

// Couleurs des trois séries, vérifiées pour la lisibilité (daltonisme compris) sur le fond des cartes
const COLORS = { visits: '#20825d', students: '#2b63a6', companies: '#b08a2a' };

const fmt = (n) => n.toLocaleString('fr-FR');
const pct = (part, whole) => (whole ? `${Math.round((part / whole) * 100)} %` : '-');
const time = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

function StatTile({ color, label, value, today, children }) {
  return (
    <div className="card-parchment p-5 sm:p-6">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden="true" />
        {label}
      </p>
      <p className="mt-2 font-sans text-4xl font-semibold tracking-tight text-night">{fmt(value)}</p>
      <p className="mt-1 text-sm text-ink-soft">
        {today > 0 ? `+${fmt(today)} aujourd'hui` : "Aucun aujourd'hui"}
      </p>
      {children && <p className="mt-3 border-t border-parchment-300/70 pt-3 text-sm text-ink">{children}</p>}
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <section className="card-parchment min-w-0 p-5 sm:p-6">
      <h2 className="text-base font-bold text-night">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function PromoTable({ students }) {
  const rows = [...students.byPromo, { code: null, name: 'Sans lien de promo', school: '', ...students.direct }];
  return (
    <section className="card-parchment overflow-hidden">
      <div className="p-5 sm:p-6">
        <h2 className="text-base font-bold text-night">Inscriptions étudiantes par lien de promo</h2>
        <p className="mt-0.5 text-sm text-ink-soft">
          Comptes créés avec chaque lien d'invitation (<code className="text-night">?promo=CODE</code>) et profils complétés
          depuis.
        </p>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-y border-parchment-300 bg-parchment-200/60 text-xs text-ink-soft">
          <tr>
            <th className="px-5 py-2.5 font-semibold sm:px-6">Lien de promo</th>
            <th className="px-3 py-2.5 text-right font-semibold">Comptes</th>
            <th className="px-5 py-2.5 text-right font-semibold sm:px-6">Profils complétés</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((r) => (
            <tr key={r.code || 'direct'} className="border-b border-parchment-200 last:border-b-0">
              <td className="px-5 py-2.5 sm:px-6">
                <span className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
                  {r.code && (
                    <span className="rounded-md bg-night px-2 py-0.5 font-mono text-xs font-semibold text-gold-light">{r.code}</span>
                  )}
                  <span className="text-ink">
                    {r.name}
                    {r.school && <span className="text-ink-soft"> · {r.school}</span>}
                  </span>
                </span>
              </td>
              <td className="px-3 py-2.5 text-right align-top font-semibold text-night sm:align-middle">{fmt(r.accounts)}</td>
              <td className="px-5 py-2.5 text-right align-top whitespace-nowrap text-night sm:px-6 sm:align-middle">
                {fmt(r.profilesComplete)} <span className="text-ink-soft">({pct(r.profilesComplete, r.accounts)})</span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-parchment-300 bg-parchment-200/40 tabular-nums">
          <tr>
            <td className="px-5 py-2.5 font-semibold text-night sm:px-6">Total</td>
            <td className="px-3 py-2.5 text-right font-bold text-night">{fmt(students.total)}</td>
            <td className="px-5 py-2.5 text-right whitespace-nowrap font-semibold text-night sm:px-6">
              {fmt(students.profilesComplete)}{' '}
              <span className="font-normal text-ink-soft">({pct(students.profilesComplete, students.total)})</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

export default function AdminHome() {
  usePageTitle('Tableau de bord');
  const { logout } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api.get('/admin/stats'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) {
    return error ? <p className="card-parchment px-6 py-10 text-center text-ruby">{error}</p> : <PageLoader label="Chargement des statistiques…" />;
  }

  const { visits, students, companies } = data;
  // Le détail des visites jour par jour commence au premier jour suivi : pas de faux zéros avant
  const tracked = visits.trackedSince ? visits.byDay.filter((d) => d.day >= visits.trackedSince) : [];

  return (
    <div className="animate-rise">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Back-office</Eyebrow>
          <h1 className="mt-3 font-display text-3xl font-bold text-night sm:text-4xl">Tableau de bord</h1>
          <p className="mt-2 text-sm text-ink-soft">Chiffres arrêtés à {time(data.generatedAt)}, heure de Paris.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="btn-ghost-dark shrink-0 px-5 py-2.5 text-sm">
          {loading && <SpinnerIcon className="h-4 w-4 animate-spin" />}
          Actualiser
        </button>
      </header>

      {error && <p className="mt-4 text-sm font-semibold text-ruby">{error}</p>}

      {/* Pendant l'actualisation, l'écran garde les chiffres précédents, atténués */}
      <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatTile color={COLORS.visits} label="Visites" value={visits.total} today={visits.today}>
            {visits.trackedSince ? `Suivies jour par jour depuis le ${shortDay(visits.trackedSince)}` : 'Le suivi jour par jour démarre à la prochaine visite'}
          </StatTile>
          <StatTile color={COLORS.students} label="Étudiants inscrits" value={students.total} today={students.today}>
            {fmt(students.profilesComplete)} profil{students.profilesComplete > 1 ? 's' : ''} complété
            {students.profilesComplete > 1 ? 's' : ''} ({pct(students.profilesComplete, students.total)})
          </StatTile>
          <StatTile color={COLORS.companies} label="Entreprises inscrites" value={companies.total} today={companies.today}>
            {fmt(companies.siretVerified)} SIRET vérifié{companies.siretVerified > 1 ? 's' : ''} · {fmt(companies.offers.active)} offre
            {companies.offers.active > 1 ? 's' : ''} en ligne
          </StatTile>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ChartCard title="Visites par jour" subtitle="Une visite = une ouverture du site, quelle que soit la suite.">
            {tracked.length >= 2 ? (
              <ColumnChart
                label="Visites par jour"
                days={tracked.map((d) => d.day)}
                series={[{ key: 'visits', label: 'Visites', unit: ['visite', 'visites'], color: COLORS.visits, values: tracked.map((d) => d.count) }]}
              />
            ) : (
              <p className="rounded-xl border border-dashed border-parchment-300 px-4 py-8 text-center text-sm text-ink-soft">
                Le détail jour par jour a commencé {visits.trackedSince ? `le ${shortDay(visits.trackedSince)}` : 'avec cette version'} :
                le graphique s'affichera dès qu'il y aura deux jours de visites. Aujourd'hui : {fmt(visits.today)} visite
                {visits.today > 1 ? 's' : ''}.
              </p>
            )}
          </ChartCard>

          <ChartCard title="Inscriptions par jour" subtitle="Comptes créés sur les 30 derniers jours.">
            <ColumnChart
              label="Inscriptions par jour, étudiants et entreprises"
              days={students.byDay.map((d) => d.day)}
              series={[
                {
                  key: 'students',
                  label: 'Étudiants',
                  unit: ['étudiant', 'étudiants'],
                  color: COLORS.students,
                  values: students.byDay.map((d) => d.count),
                },
                {
                  key: 'companies',
                  label: 'Entreprises',
                  unit: ['entreprise', 'entreprises'],
                  color: COLORS.companies,
                  values: companies.byDay.map((d) => d.count),
                },
              ]}
            />
          </ChartCard>
        </div>

        <div className="mt-6">
          <PromoTable students={students} />
        </div>
      </div>

      <Divider className="my-10" />
      <div className="flex justify-center">
        <button type="button" onClick={logout} className="btn-ghost-dark px-5 py-2.5 text-sm">
          Me déconnecter
        </button>
      </div>
    </div>
  );
}

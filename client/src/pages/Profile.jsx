import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { usePageTitle } from '../lib/usePageTitle.js';
import { PageLoader } from '../components/ProtectedRoute.jsx';
import { Corners, Divider, Eyebrow, ScoreRing } from '../components/Ornament.jsx';
import { ChoicePills, CvUpload, FieldGroup, TagInput } from '../components/ProfileFields.jsx';
import { FormError } from '../components/AuthLayout.jsx';
import { ArrowIcon, CheckIcon, SpinnerIcon } from '../components/Icons.jsx';

const EMPTY = {
  formation: '',
  niveau: null,
  competences: [],
  ville: '',
  rythme: '',
  formationPrecedente: '',
  diplomeObtenu: '',
  telephone: '',
  adresse: '',
  cvWebUrl: '',
};

const DIPLOMES = [
  'Baccalauréat général',
  'Baccalauréat technologique',
  'Baccalauréat professionnel',
  'BTS',
  'BUT',
  'Licence',
];

const NIVEAUX = [
  { value: 'bac+2', label: 'Bac+2' },
  { value: 'bac+3', label: 'Bac+3' },
  { value: 'bac+4', label: 'Bac+4' },
  { value: 'bac+5', label: 'Bac+5' },
];

const RYTHMES = [
  '2 j. école / 3 j. entreprise',
  '1 sem. école / 3 sem. entreprise',
  '2 sem. école / 2 sem. entreprise',
  '1 mois / 1 mois',
];

const FORMATIONS = [
  'BTS SIO',
  'BTS MCO',
  'BTS NDRC',
  'BTS Comptabilité et gestion',
  'BUT Informatique',
  'BUT GEA',
  'BUT Techniques de commercialisation',
  'Licence professionnelle',
  'Bachelor',
  'Master',
];

const VILLES = [
  'Paris',
  'Lyon',
  'Marseille',
  'Toulouse',
  'Lille',
  'Bordeaux',
  'Nantes',
  'Strasbourg',
  'Rennes',
  'Montpellier',
];

const COMPETENCES = [
  'Communication',
  'Gestion de projet',
  'Excel',
  'Anglais',
  'JavaScript',
  'React',
  'Python',
  'SQL',
  'Marketing digital',
  'Relation client',
];

// Compétences proposées selon le domaine de la formation saisie (repli : la liste générale)
const COMPETENCES_PAR_DOMAINE = [
  {
    match: /info|\bsio\b|developp|\bweb\b|numerique|reseau|\bdata\b|cyber|logiciel/,
    list: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Git', 'Linux', 'Docker', 'Support utilisateur', 'Anglais'],
  },
  {
    match: /ndrc|\bmco\b|commerc|vente|\btc\b|business|negoc/,
    list: ['Vente', 'Prospection', 'Négociation', 'Relation client', 'CRM', 'Communication', 'Excel', 'Anglais'],
  },
  {
    match: /compta|gestion|gea|finance|controle|audit|paie/,
    list: ['Comptabilité', 'Excel', 'Contrôle de gestion', 'Fiscalité', 'Paie', 'Power BI', 'Sage'],
  },
  {
    match: /marketing|communication|\bcom\b|evenement|journalis|graph/,
    list: ['Marketing digital', 'Réseaux sociaux', 'Canva', 'Rédaction', 'SEO', 'Communication', 'Gestion de projet'],
  },
  {
    match: /\brh\b|ressources humaines|recrutement/,
    list: ['Recrutement', 'Droit du travail', 'Paie', 'Communication', 'Excel', 'Gestion administrative'],
  },
  {
    match: /maintenance|industri|mecani|electro|genie|production|logistique/,
    list: ['Électrotechnique', 'Mécanique', 'Maintenance préventive', 'Lecture de plans', 'Sécurité', 'Logistique'],
  },
];

const normalizeText = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const suggestionsFor = (formation) =>
  COMPETENCES_PAR_DOMAINE.find((d) => d.match.test(normalizeText(formation)))?.list ?? COMPETENCES;

// Les cinq critères qui servent au score de compatibilité
const CRITERIA = [
  { key: 'formation', label: 'Formation', done: (p) => Boolean(p.formation.trim()) },
  { key: 'niveau', label: 'Niveau', done: (p) => Boolean(p.niveau) },
  { key: 'competences', label: 'Compétences', done: (p) => p.competences.length > 0 },
  { key: 'ville', label: 'Ville', done: (p) => Boolean(p.ville.trim()) },
  { key: 'rythme', label: "Rythme d'alternance", done: (p) => Boolean(p.rythme) },
];

// Ce que l'entreprise reçoit en plus du profil : pas obligatoire pour le score, mais recommandé pour postuler
const DOSSIER = [
  { key: 'cv', label: 'CV (PDF ou lien)', done: (p, cv) => Boolean(cv || p.cvWebUrl.trim()) },
  { key: 'telephone', label: 'Téléphone', done: (p) => Boolean(p.telephone.trim()) },
  { key: 'parcours', label: 'Diplôme obtenu', done: (p) => Boolean(p.diplomeObtenu.trim()) },
];

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// « monportfolio.fr » devient « https://monportfolio.fr »
const withHttps = (url) => {
  const v = url.trim();
  return v && !/^https?:\/\//i.test(v) ? `https://${v}` : v;
};

export default function Profile() {
  usePageTitle('Mon profil');
  const { user, logout } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [cv, setCv] = useState(null);

  useEffect(() => {
    api
      .get('/profile')
      .then(({ profile, cv: file }) => {
        setForm(profile);
        setSaved(profile);
        setCv(file);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setJustSaved(false);
  };

  const doneCount = CRITERIA.filter((c) => c.done(form)).length;
  const percent = Math.round((doneCount / CRITERIA.length) * 100);
  const dirty = useMemo(() => !same(form, saved), [form, saved]);
  const wasComplete = CRITERIA.every((c) => c.done(saved));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { profile, complete } = await api.put('/profile', { ...form, cvWebUrl: withHttps(form.cvWebUrl) });
      setForm(profile);
      setSaved(profile);
      setJustSaved(true);
      setJustCompleted(complete && !wasComplete);
    } catch (err) {
      setError(err.details?.[0]?.message || err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader label="Chargement de ton profil…" />;

  return (
    <div className="animate-rise">
      <header>
        <Eyebrow>Ton espace</Eyebrow>
        <h1 className="mt-3 font-display text-4xl font-bold text-night">Mon profil</h1>
        <p className="mt-2 max-w-xl text-ink-soft">
          Plus ton profil est précis, plus ton score de compatibilité est juste. Il part aussi avec chacune de tes
          candidatures.
        </p>
      </header>

      {justCompleted && (
        <div className="bg-night-sky relative mt-8 flex flex-col items-start gap-4 overflow-hidden rounded-2xl border border-gold/30 p-6 text-parchment sm:flex-row sm:items-center sm:justify-between">
          <div className="stardust absolute inset-0" aria-hidden="true" />
          <div className="relative">
            <p className="font-display text-xl font-bold">
              Profil complet, <span className="text-gold-gradient">tes offres t'attendent</span>
            </p>
            <p className="mt-1 text-sm text-parchment/70">
              On les a classées de la plus compatible à la moins compatible.
            </p>
          </div>
          <Link to="/offres" className="btn-gold relative shrink-0">
            Voir mes offres <ArrowIcon className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit} className="card-parchment relative">
          <div className="space-y-8 p-6 sm:p-9">
            <section className="space-y-6">
              <h2 className="eyebrow text-gold-dark">Tes études</h2>
              <FieldGroup
                label="Formation"
                htmlFor="formation"
                hint="Le nom de ton diplôme ou de ta filière."
                done={CRITERIA[0].done(form)}
              >
                <input
                  id="formation"
                  list="formations"
                  value={form.formation}
                  onChange={(e) => set('formation')(e.target.value)}
                  placeholder="Ex. BUT Informatique"
                  maxLength={120}
                  className="field"
                />
                <datalist id="formations">
                  {FORMATIONS.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </FieldGroup>

              <FieldGroup
                label="Niveau visé"
                hint="Le niveau du diplôme que tu prépares en alternance."
                done={CRITERIA[1].done(form)}
              >
                <ChoicePills name="Niveau visé" options={NIVEAUX} value={form.niveau} onChange={set('niveau')} />
              </FieldGroup>

              <FieldGroup
                label="Compétences"
                htmlFor="competences"
                hint="Appuie sur Entrée après chaque compétence."
                done={CRITERIA[2].done(form)}
              >
                <TagInput
                  id="competences"
                  value={form.competences}
                  onChange={set('competences')}
                  suggestions={suggestionsFor(form.formation)}
                  placeholder="Ex. React, gestion de projet…"
                />
              </FieldGroup>

              <div className="grid gap-6 sm:grid-cols-2">
                <FieldGroup
                  label="Formation précédente"
                  htmlFor="formationPrecedente"
                  hint="Ce que tu as suivi avant."
                  done={Boolean(form.formationPrecedente.trim())}
                >
                  <input
                    id="formationPrecedente"
                    value={form.formationPrecedente}
                    onChange={(e) => set('formationPrecedente')(e.target.value)}
                    placeholder="Ex. Bac général, spé. NSI"
                    maxLength={120}
                    className="field"
                  />
                </FieldGroup>
                <FieldGroup
                  label="Diplôme obtenu"
                  htmlFor="diplomeObtenu"
                  hint="Ton dernier diplôme, avec l'année."
                  done={Boolean(form.diplomeObtenu.trim())}
                >
                  <input
                    id="diplomeObtenu"
                    list="diplomes"
                    value={form.diplomeObtenu}
                    onChange={(e) => set('diplomeObtenu')(e.target.value)}
                    placeholder="Ex. Baccalauréat (2024)"
                    maxLength={120}
                    className="field"
                  />
                  <datalist id="diplomes">
                    {DIPLOMES.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </FieldGroup>
              </div>
            </section>

            <Divider />

            <section className="space-y-6">
              <h2 className="eyebrow text-gold-dark">Ton alternance</h2>
              <FieldGroup
                label="Ville"
                htmlFor="ville"
                hint="Où tu cherches ton entreprise."
                done={CRITERIA[3].done(form)}
              >
                <input
                  id="ville"
                  list="villes"
                  value={form.ville}
                  onChange={(e) => set('ville')(e.target.value)}
                  placeholder="Ex. Lyon"
                  maxLength={80}
                  autoComplete="address-level2"
                  className="field"
                />
                <datalist id="villes">
                  {VILLES.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              </FieldGroup>

              <FieldGroup label="Rythme d'alternance" hint="Celui que propose ton école." done={CRITERIA[4].done(form)}>
                {/* Un rythme enregistré hors de la liste reste affiché et sélectionné */}
                <ChoicePills
                  name="Rythme d'alternance"
                  options={!saved.rythme || RYTHMES.includes(saved.rythme) ? RYTHMES : [...RYTHMES, saved.rythme]}
                  value={form.rythme || null}
                  onChange={(v) => set('rythme')(v || '')}
                />
              </FieldGroup>
            </section>

            <Divider />

            <section className="space-y-6">
              <div>
                <h2 className="eyebrow text-gold-dark">Tes coordonnées</h2>
                <p className="mt-1 text-xs text-ink-soft">
                  Visibles uniquement par les entreprises auxquelles tu postules.
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-[1fr_1.6fr]">
                <FieldGroup label="Téléphone" htmlFor="telephone" done={Boolean(form.telephone.trim())}>
                  <input
                    id="telephone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.telephone}
                    onChange={(e) => set('telephone')(e.target.value)}
                    placeholder="06 12 34 56 78"
                    maxLength={25}
                    className="field"
                  />
                </FieldGroup>
                <FieldGroup label="Adresse" htmlFor="adresse" done={Boolean(form.adresse.trim())}>
                  <input
                    id="adresse"
                    autoComplete="street-address"
                    value={form.adresse}
                    onChange={(e) => set('adresse')(e.target.value)}
                    placeholder="12 rue des Lilas, 69003 Lyon"
                    maxLength={200}
                    className="field"
                  />
                </FieldGroup>
              </div>
            </section>

            <Divider />

            <section className="space-y-6">
              <div>
                <h2 className="eyebrow text-gold-dark">Ton CV</h2>
                <p className="mt-1 text-xs text-ink-soft">Il part avec chacune de tes candidatures.</p>
              </div>
              <FieldGroup label="CV à imprimer" hint="Un PDF, enregistré dès que tu le déposes." done={Boolean(cv)}>
                <CvUpload cv={cv} onChange={setCv} />
              </FieldGroup>
              <FieldGroup
                label="CV en ligne"
                htmlFor="cvWebUrl"
                hint="Lien vers ton CV web, ton portfolio ou ton profil LinkedIn."
                done={Boolean(form.cvWebUrl.trim())}
              >
                <input
                  id="cvWebUrl"
                  // Pas de type="url" : le navigateur refuserait « monportfolio.fr ». On complète à la sortie du champ.
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={form.cvWebUrl}
                  onChange={(e) => set('cvWebUrl')(e.target.value)}
                  onBlur={(e) => set('cvWebUrl')(withHttps(e.target.value))}
                  placeholder="https://"
                  maxLength={300}
                  className="field"
                />
              </FieldGroup>
            </section>

            <FormError>{error}</FormError>
          </div>

          {/* Barre d'enregistrement, collée en bas de l'écran pendant la saisie */}
          <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 flex sm:bottom-0 items-center justify-between gap-3 rounded-b-2xl border-t border-parchment-300/80 bg-parchment-100/95 px-4 py-3 backdrop-blur sm:px-9 sm:py-4">
            <p className="min-w-0 text-xs sm:text-sm" aria-live="polite">
              {dirty ? (
                <span className="flex items-center gap-2 font-semibold text-gold-dark">
                  <span className="h-2 w-2 rounded-full bg-gold" /> Modifications non enregistrées
                </span>
              ) : justSaved ? (
                <span className="flex items-center gap-2 font-semibold text-emerald">
                  <CheckIcon className="h-4 w-4" /> Profil enregistré
                </span>
              ) : (
                <span className="text-ink-soft">
                  {same(saved, EMPTY) ? 'Commence par ta formation.' : 'Tout est à jour.'}
                </span>
              )}
            </p>
            <button
              type="submit"
              disabled={!dirty || saving}
              className="btn-gold shrink-0 px-4 py-2.5 text-sm sm:min-w-56 sm:px-5 sm:py-3 sm:text-base"
            >
              {saving ? (
                <>
                  <SpinnerIcon className="h-4 w-4 animate-spin" /> Enregistrement…
                </>
              ) : (
                <>
                  {/* Un seul nœud texte : le « gap » du bouton créait un double espace */}
                  <span>
                    Enregistrer<span className="hidden sm:inline"> mon profil</span>
                  </span>
                </>
              )}
            </button>
          </div>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="bg-night-sky relative overflow-hidden rounded-2xl border border-gold/25 p-6 text-parchment">
            <div className="stardust absolute inset-0" aria-hidden="true" />
            <Corners className="text-gold/40" size="h-4 w-4" inset="0.6rem" />
            <div className="relative">
              <div className="flex items-center gap-4">
                <span className="rounded-full bg-parchment-100 p-1">
                  <ScoreRing value={percent} size={72} unit="%" label={`Profil complété à ${percent} %`} />
                </span>
                <div>
                  <p className="font-display text-lg font-bold">
                    {percent === 100 ? 'Profil complet' : 'Profil en cours'}
                  </p>
                  <p className="text-sm text-parchment/65">
                    {doneCount} critère{doneCount > 1 ? 's' : ''} sur {CRITERIA.length}
                  </p>
                </div>
              </div>

              <ul className="mt-6 space-y-2.5 text-sm">
                {CRITERIA.map((c) => {
                  const ok = c.done(form);
                  return (
                    <li
                      key={c.key}
                      className={`flex items-center gap-2.5 ${ok ? 'text-parchment' : 'text-parchment/50'}`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${
                          ok ? 'border-emerald-light bg-emerald text-parchment' : 'border-parchment/25'
                        }`}
                      >
                        {ok && <CheckIcon className="h-3 w-3" />}
                      </span>
                      {c.label}
                    </li>
                  );
                })}
              </ul>

              <p className="eyebrow mt-6 text-[10px] text-gold-light/80">Ton dossier · recommandé</p>
              <ul className="mt-2.5 space-y-2.5 text-sm">
                {DOSSIER.map((d) => {
                  const ok = d.done(form, cv);
                  return (
                    <li
                      key={d.key}
                      className={`flex items-center gap-2.5 ${ok ? 'text-parchment' : 'text-parchment/50'}`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${
                          ok ? 'border-gold-light bg-gold text-night' : 'border-dashed border-parchment/30'
                        }`}
                      >
                        {ok && <CheckIcon className="h-3 w-3" />}
                      </span>
                      {d.label}
                    </li>
                  );
                })}
              </ul>

              {wasComplete && !dirty && (
                <Link to="/offres" className="btn-gold mt-6 w-full text-sm">
                  Voir mes offres <ArrowIcon className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          <div className="card-parchment p-5">
            <p className="eyebrow text-gold-dark">Compte</p>
            <p className="mt-2 truncate text-sm font-semibold text-night" title={user.email}>
              {user.email}
            </p>
            <button
              type="button"
              onClick={logout}
              className="mt-4 w-full rounded-lg border border-parchment-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink-soft transition hover:border-ruby/40 hover:text-ruby"
            >
              Me déconnecter
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

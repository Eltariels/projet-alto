import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { usePageTitle } from '../../lib/usePageTitle.js';
import { PageLoader } from '../../components/ProtectedRoute.jsx';
import { Badge, Divider, Eyebrow } from '../../components/Ornament.jsx';
import { FormError } from '../../components/AuthLayout.jsx';
import { ChoicePills, FieldGroup, TagInput } from '../../components/ProfileFields.jsx';
import { AlertIcon, ArrowIcon, CheckIcon, PlusIcon, SparkIcon, SpinnerIcon } from '../../components/Icons.jsx';
import { BackLink, badgeMessage, TONES } from './shared.jsx';

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

const CONTRATS = [
  { value: 'apprentissage', label: 'Apprentissage' },
  { value: 'professionnalisation', label: 'Professionnalisation' },
];

const COMPETENCES = ['Communication', 'Gestion de projet', 'Excel', 'Anglais', 'Marketing digital', 'Vente', 'JavaScript', 'Python'];

const EMPTY = {
  title: '',
  ville: '',
  niveau: null,
  rythme: null,
  contrat: null,
  duree: '',
  secteur: '',
  missions: '',
  profilRecherche: '',
  formation: '',
  competences: [],
  experienceRequise: '',
  remuneration: '',
};

const fromFiche = (f) => ({
  title: f.titre || '',
  ville: f.ville || '',
  niveau: f.niveau,
  rythme: f.rythme,
  contrat: f.contrat,
  duree: f.duree || '',
  secteur: f.secteur || '',
  missions: (f.missions || []).join('\n'),
  profilRecherche: f.profil || '',
  formation: f.formation || '',
  competences: f.competences || [],
  experienceRequise: f.experience || '',
  remuneration: f.remuneration || '',
});

// Ce que l'annonce ne précisait pas, dans les mots de l'entreprise
const MISSING = {
  entreprise: "le nom de l'entreprise",
  ville: 'la ville',
  contrat: 'le type de contrat',
  duree: 'la durée',
  rythme: 'le rythme',
  niveau: 'le niveau',
  missions: 'les missions',
  profil: 'le profil recherché',
  remuneration: 'la rémunération',
};
const FIELD_OF = { profil: 'profilRecherche' };

const MIN_TEXT = 80;

function Steps({ step }) {
  const items = ['Votre annonce', 'La fiche', 'Publiée'];
  return (
    <ol className="flex items-center gap-3 text-xs font-semibold">
      {items.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-display ${
                current ? 'bg-night text-gold-light' : done ? 'bg-emerald text-parchment' : 'border border-parchment-300 bg-white text-ink-soft'
              }`}
            >
              {done ? <CheckIcon className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={current ? 'text-night' : 'text-ink-soft'}>{label}</span>
            {i < items.length - 1 && <span className="h-px flex-1 bg-gradient-to-r from-gold/60 to-parchment-300" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

// L'IA peut mettre une vingtaine de secondes : on dit ce qui se passe
function Waiting({ label }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, []);
  return (
    <span className="flex items-center gap-2">
      <SpinnerIcon className="h-4 w-4 animate-spin" />
      {slow ? 'Encore quelques secondes…' : label}
    </span>
  );
}

function TextInput({ id, missing, ...props }) {
  return <input id={id} {...props} className={`field ${missing ? 'border-gold ring-4 ring-gold/15' : ''}`} />;
}

export default function PublishOffer() {
  usePageTitle('Publier une offre');
  const [me, setMe] = useState(null);
  const [step, setStep] = useState(0);
  const [texte, setTexte] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [fiche, setFiche] = useState(null); // ce que l'IA a renvoyé : champs manquants, annonce exploitable
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [published, setPublished] = useState(null);
  const top = useRef(null);

  useEffect(() => {
    api
      .get('/entreprise/moi')
      .then(setMe)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    top.current?.scrollIntoView({ block: 'start' });
  }, [step]);

  if (!me) return error ? <FormError>{error}</FormError> : <PageLoader />;

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value?.target ? value.target.value : value }));
  const missing = new Set((fiche?.manquants || []).map((m) => FIELD_OF[m] || m));

  async function formatWithAi() {
    setError('');
    setBusy(true);
    try {
      const { fiche: f } = await api.post('/entreprise/offres/mise-en-forme', { texte });
      setFiche(f);
      setForm(fromFiche(f));
      setStep(1);
    } catch (err) {
      setError(err.details?.[0]?.message || err.message);
    } finally {
      setBusy(false);
    }
  }

  function fillByHand() {
    setError('');
    setFiche(null);
    setForm(EMPTY);
    setStep(1);
  }

  async function publish(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const missions = form.missions
        .split('\n')
        .map((m) => m.replace(/^[-•*\s]+/, '').trim())
        .filter(Boolean);
      const { offer } = await api.post('/entreprise/offres', { ...form, texte, missions });
      setPublished(offer);
      setStep(2);
    } catch (err) {
      setError(err.details?.[0]?.message || err.message);
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setTexte('');
    setForm(EMPTY);
    setFiche(null);
    setPublished(null);
    setError('');
    setStep(0);
  }

  const missingLabels = (fiche?.manquants || []).map((m) => MISSING[m]).filter(Boolean);
  const rythmes = !form.rythme || RYTHMES.includes(form.rythme) ? RYTHMES : [...RYTHMES, form.rythme];

  return (
    <div ref={top} className="mx-auto max-w-3xl scroll-mt-24 animate-rise">
      <BackLink />
      <div className="mt-6">
        <Eyebrow>Publier une offre</Eyebrow>
        <h1 className="mt-3 font-display text-3xl font-bold text-night sm:text-4xl">
          {step === 2 ? 'Votre offre est publiée' : step === 1 ? 'Relisez la fiche' : 'Votre annonce'}
        </h1>
      </div>
      <div className="mt-6">
        <Steps step={step} />
      </div>

      {step === 0 && (
        <section className="card-parchment mt-8 p-6 sm:p-9">
          <label htmlFor="annonce" className="text-sm font-bold text-night">
            Collez votre annonce
          </label>
          <p className="mt-0.5 text-xs text-ink-soft">
            Telle que vous l'avez déjà rédigée, même en vrac : intitulé, missions, profil, lieu, rythme, rémunération.
          </p>
          <textarea
            id="annonce"
            rows={12}
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            maxLength={12000}
            className="field mt-3 resize-y leading-relaxed"
            placeholder={"Chargé(e) de marketing digital en alternance\nNous sommes une épicerie fine en ligne de 18 salariés, à Bordeaux…"}
          />
          <p className={`mt-1.5 text-right text-xs ${texte.trim().length < MIN_TEXT ? 'text-ink-soft' : 'text-emerald'}`}>
            {texte.trim().length} caractères{texte.trim().length < MIN_TEXT ? ` (${MIN_TEXT} au moins)` : ''}
          </p>

          {!me.ai && (
            <p className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${TONES.neutral}`}>
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              La mise en forme par l'IA n'est pas disponible pour l'instant : vous remplirez la fiche vous-même.
            </p>
          )}
          <div className="mt-4">
            <FormError>{error}</FormError>
          </div>

          <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={fillByHand} className="text-sm font-semibold text-azure underline-offset-4 hover:underline">
              Remplir la fiche sans l'IA
            </button>
            {me.ai && (
              <button
                type="button"
                onClick={formatWithAi}
                disabled={busy || texte.trim().length < MIN_TEXT}
                className="btn-gold px-6"
              >
                {busy ? (
                  <Waiting label="L'IA lit votre annonce…" />
                ) : (
                  <>
                    <SparkIcon className="h-4 w-4" /> Créer la fiche avec l'IA
                  </>
                )}
              </button>
            )}
          </div>
        </section>
      )}

      {step === 1 && (
        <form onSubmit={publish} className="card-parchment mt-8 space-y-7 p-6 sm:p-9">
          {fiche && !fiche.exploitable && (
            <p className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${TONES.ruby}`}>
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              L'IA n'a pas trouvé assez d'informations dans l'annonce pour en faire une fiche : complétez-la vous-même.
            </p>
          )}
          {fiche?.exploitable && (
            <p className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${missingLabels.length ? TONES.gold : TONES.emerald}`}>
              <SparkIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                L'IA a rempli la fiche à partir de votre annonce. Relisez-la avant de publier.
                {missingLabels.length > 0 && (
                  <>
                    {' '}
                    L'annonce ne précise pas <strong>{missingLabels.join(', ')}</strong> : complétez si vous le pouvez, les
                    étudiants s'y fient pour postuler.
                  </>
                )}
              </span>
            </p>
          )}

          <FieldGroup label="Intitulé du poste" htmlFor="title">
            <TextInput id="title" required maxLength={120} value={form.title} onChange={set('title')} placeholder="Chargé·e de marketing digital" />
          </FieldGroup>

          <div className="grid gap-7 sm:grid-cols-2">
            <FieldGroup label="Ville" htmlFor="ville">
              <TextInput id="ville" required maxLength={80} value={form.ville} onChange={set('ville')} missing={missing.has('ville')} placeholder="Bordeaux" />
            </FieldGroup>
            <FieldGroup label="Secteur" htmlFor="secteur">
              <TextInput id="secteur" maxLength={60} value={form.secteur} onChange={set('secteur')} placeholder="Marketing" />
            </FieldGroup>
          </div>

          <FieldGroup label="Niveau du diplôme préparé" hint={missing.has('niveau') ? "Non précisé dans l'annonce." : undefined}>
            <ChoicePills name="Niveau du diplôme préparé" options={NIVEAUX} value={form.niveau} onChange={set('niveau')} />
          </FieldGroup>

          <FieldGroup label="Rythme d'alternance" hint={missing.has('rythme') ? "Non précisé dans l'annonce." : undefined}>
            <ChoicePills name="Rythme d'alternance" options={rythmes} value={form.rythme} onChange={set('rythme')} />
          </FieldGroup>

          <div className="grid gap-7 sm:grid-cols-2">
            <FieldGroup label="Contrat" hint={missing.has('contrat') ? "Non précisé dans l'annonce." : undefined}>
              <ChoicePills name="Contrat" options={CONTRATS} value={form.contrat} onChange={set('contrat')} />
            </FieldGroup>
            <FieldGroup label="Durée" htmlFor="duree">
              <TextInput id="duree" maxLength={60} value={form.duree} onChange={set('duree')} missing={missing.has('duree')} placeholder="24 mois" />
            </FieldGroup>
          </div>

          <Divider />

          <FieldGroup label="Missions" htmlFor="missions" hint="Une mission par ligne.">
            <textarea
              id="missions"
              required
              rows={5}
              value={form.missions}
              onChange={set('missions')}
              className={`field resize-y leading-relaxed ${missing.has('missions') ? 'border-gold ring-4 ring-gold/15' : ''}`}
              placeholder={'Animer notre Instagram et notre newsletter\nSuivre nos campagnes Meta et Google Ads'}
            />
          </FieldGroup>

          <FieldGroup label="Profil recherché" htmlFor="profil">
            <textarea
              id="profil"
              rows={3}
              maxLength={600}
              value={form.profilRecherche}
              onChange={set('profilRecherche')}
              className={`field resize-y leading-relaxed ${missing.has('profilRecherche') ? 'border-gold ring-4 ring-gold/15' : ''}`}
              placeholder="Tu prépares un bac+3 à bac+5 en marketing digital."
            />
          </FieldGroup>

          <div className="grid gap-7 sm:grid-cols-2">
            <FieldGroup label="Formation visée" htmlFor="formation" hint="Sert au score de compatibilité des étudiants.">
              <TextInput id="formation" maxLength={200} value={form.formation} onChange={set('formation')} placeholder="Bachelor marketing digital" />
            </FieldGroup>
            <FieldGroup label="Rémunération" htmlFor="remuneration">
              <TextInput
                id="remuneration"
                maxLength={200}
                value={form.remuneration}
                onChange={set('remuneration')}
                missing={missing.has('remuneration')}
                placeholder="Selon la grille légale de l'apprentissage"
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Compétences demandées" htmlFor="competences" hint="Entrée ou virgule pour ajouter. Elles comptent dans le score.">
            <TagInput
              id="competences"
              value={form.competences}
              onChange={set('competences')}
              suggestions={COMPETENCES}
              max={12}
              placeholder="Marketing digital, Canva…"
            />
          </FieldGroup>

          <FieldGroup
            label="Expérience demandée"
            htmlFor="experience"
            hint="Laissez vide si aucune. Une offre qui exige déjà de l'expérience est signalée aux étudiants : l'alternance sert à en acquérir."
          >
            <TextInput id="experience" maxLength={200} value={form.experienceRequise} onChange={set('experienceRequise')} placeholder="Une première expérience en projet d'école suffit" />
          </FieldGroup>

          <FormError>{error}</FormError>

          <div className="flex flex-col-reverse items-stretch gap-3 border-t border-parchment-300/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => setStep(0)} className="text-sm font-semibold text-azure underline-offset-4 hover:underline">
              Revenir à l'annonce
            </button>
            <button type="submit" disabled={busy || !form.niveau || !form.rythme} className="btn-gold px-6">
              {busy ? (
                <Waiting label="Vérification de l'offre…" />
              ) : (
                <>
                  Publier l'offre <ArrowIcon className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
          {(!form.niveau || !form.rythme) && (
            <p className="-mt-4 text-right text-xs text-ink-soft">Choisissez le niveau et le rythme pour publier.</p>
          )}
        </form>
      )}

      {step === 2 && published && (
        <section className="card-parchment mt-8 p-6 text-center sm:p-10">
          <Badge type={published.badge} />
          <h2 className="mt-4 font-display text-2xl font-bold text-night">{published.title}</h2>
          {(() => {
            const m = badgeMessage(published);
            return (
              <div className={`mx-auto mt-6 max-w-xl rounded-xl border px-5 py-4 text-left text-sm ${TONES[m.tone]}`}>
                <p className="font-semibold">{m.text}</p>
                {published.badge && published.badgeReason && <p className="mt-2 opacity-90">Raison : {published.badgeReason}</p>}
              </div>
            );
          })()}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to={`/entreprise/offres/${published.id}`} className="btn-gold px-6">
              Voir l'offre et ses candidats <ArrowIcon className="h-4 w-4" />
            </Link>
            <button type="button" onClick={restart} className="btn-ghost-dark px-5">
              <PlusIcon className="h-4 w-4" /> Publier une autre offre
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

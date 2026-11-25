import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePageTitle } from '../../lib/usePageTitle.js';
import { homeFor } from '../../lib/roles.js';
import AuthLayout, { Field, FormError, PasswordField, PasswordStrength, SubmitButton } from '../../components/AuthLayout.jsx';
import { ArrowIcon, GaugeIcon, ShieldIcon, SparkIcon } from '../../components/Icons.jsx';

const PERKS = [
  { icon: SparkIcon, title: 'Votre annonce mise en forme', text: "Collez-la : l'IA en fait une fiche claire." },
  { icon: ShieldIcon, title: 'Une offre vérifiée', text: 'Votre SIRET contrôlé, votre offre en confiance.' },
  { icon: GaugeIcon, title: 'Des candidats compatibles', text: 'Classés par score, avec CV et coordonnées.' },
];

// 14 chiffres, affichés par groupes comme sur un Kbis : 123 456 789 00011
const formatSiret = (v) =>
  v
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/^(\d{3})(\d{0,3})(\d{0,3})(\d{0,5}).*$/, (_, a, b, c, d) => [a, b, c, d].filter(Boolean).join(' '));

export default function CompanyRegister() {
  usePageTitle('Espace entreprise');
  const { user, registerCompany } = useAuth();
  const [form, setForm] = useState({ companyName: '', siret: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={homeFor(user)} replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: key === 'siret' ? formatSiret(e.target.value) : e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await registerCompany({ ...form, siret: form.siret.replace(/\s/g, '') });
    } catch (err) {
      setError(err.details?.[0]?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Espace entreprise"
      title="Recrutez un alternant"
      subtitle="Publiez vos offres, ALTO les vérifie et vous présente les étudiants dont le profil correspond."
      perks={PERKS}
      aside={
        <>
          Des candidats qui <span className="text-gold-gradient">vous correspondent</span>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field
          label="Nom de l'entreprise"
          autoComplete="organization"
          required
          autoFocus
          value={form.companyName}
          onChange={set('companyName')}
          placeholder="Maison Lauzet"
        />
        <Field
          label="SIRET"
          inputMode="numeric"
          required
          value={form.siret}
          onChange={set('siret')}
          placeholder="123 456 789 00011"
          hint="Les 14 chiffres de votre établissement. Nous le vérifions dans l'annuaire des entreprises (INSEE)."
          aria-invalid={/SIRET|établissement/.test(error)}
        />
        <Field
          label="E-mail professionnel"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={form.email}
          onChange={set('email')}
          placeholder="prenom.nom@entreprise.fr"
        />
        <PasswordField
          label="Mot de passe"
          autoComplete="new-password"
          required
          minLength={8}
          value={form.password}
          onChange={set('password')}
          hint={form.password ? undefined : '8 caractères minimum.'}
        >
          <PasswordStrength value={form.password} />
        </PasswordField>
        <FormError>{error}</FormError>
        <SubmitButton loading={submitting} loadingLabel="Vérification du SIRET…">
          Créer l'espace entreprise <ArrowIcon className="h-4 w-4" />
        </SubmitButton>
      </form>

      <div className="mt-8 rounded-xl border border-parchment-300/80 bg-parchment/60 px-4 py-3 text-center text-sm text-ink-soft">
        Déjà un espace ?{' '}
        <Link to="/connexion" className="font-bold text-azure underline-offset-4 hover:text-night hover:underline">
          Connectez-vous
        </Link>
      </div>
    </AuthLayout>
  );
}

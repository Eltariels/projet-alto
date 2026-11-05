import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { usePageTitle } from '../lib/usePageTitle.js';
import AuthLayout, {
  Field,
  FormError,
  PasswordField,
  PasswordStrength,
  SubmitButton,
} from '../components/AuthLayout.jsx';
import { ArrowIcon, CheckIcon } from '../components/Icons.jsx';

// L'inscription se fait en deux temps : le compte ici, puis le profil
function Steps() {
  return (
    <ol className="mb-7 flex items-center gap-3 text-xs font-semibold">
      <li className="flex items-center gap-2 text-night">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-night font-display text-gold-light">1</span>
        Ton compte
      </li>
      <span className="h-px flex-1 bg-gradient-to-r from-gold/60 to-parchment-300" aria-hidden="true" />
      <li className="flex items-center gap-2 text-ink-soft">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-parchment-300 bg-white font-display">2</span>
        Ton profil
      </li>
    </ol>
  );
}

export default function Register() {
  usePageTitle('Créer mon compte');
  const [params] = useSearchParams();
  const inviteCode = params.get('promo') || undefined;
  const { user, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Après inscription, on complète d'abord le profil
  if (user) return <Navigate to="/profil" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(email, password, inviteCode);
    } catch (err) {
      setError(err.details?.[0]?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Inscription"
      title="Créer mon compte"
      subtitle="Deux minutes, puis tes offres sont classées pour toi."
      aside={
        <>
          Ne postule qu'aux <span className="text-gold-gradient">vraies offres</span>
        </>
      }
    >
      <Steps />

      {inviteCode && (
        <p className="mb-5 flex items-center gap-2.5 rounded-lg border border-emerald/30 bg-emerald/5 px-3 py-2.5 text-sm font-medium text-emerald">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald/15">
            <CheckIcon className="h-3.5 w-3.5" />
          </span>
          Tu t'inscris avec le lien d'invitation de ta promo.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="prenom.nom@ecole.fr"
          aria-invalid={Boolean(error)}
        />
        <PasswordField
          label="Mot de passe"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={password ? undefined : '8 caractères minimum.'}
        >
          <PasswordStrength value={password} />
        </PasswordField>
        <FormError>{error}</FormError>
        <SubmitButton loading={submitting} loadingLabel="Création…">
          Créer mon compte <ArrowIcon className="h-4 w-4" />
        </SubmitButton>
      </form>

      <div className="mt-8 rounded-xl border border-parchment-300/80 bg-parchment/60 px-4 py-3 text-center text-sm text-ink-soft">
        Déjà inscrit·e ?{' '}
        <Link to="/connexion" className="font-bold text-azure underline-offset-4 hover:text-night hover:underline">
          Connecte-toi
        </Link>
      </div>
    </AuthLayout>
  );
}

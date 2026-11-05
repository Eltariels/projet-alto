import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { usePageTitle } from '../lib/usePageTitle.js';
import AuthLayout, { Field, FormError, SubmitButton } from '../components/AuthLayout.jsx';
import { CheckIcon } from '../components/Icons.jsx';

export default function ForgotPassword() {
  usePageTitle('Mot de passe oublié');
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/profil" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.details?.[0]?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Mot de passe oublié"
      title="Pas de panique"
      subtitle="Indique l'e-mail de ton compte : on t'envoie un lien pour choisir un nouveau mot de passe."
      aside={
        <>
          Retrouve l'accès à <span className="text-gold-gradient">ton compte</span>
        </>
      }
    >
      {sent ? (
        <div role="status">
          <p className="flex items-start gap-3 rounded-lg border border-emerald/30 bg-emerald/5 px-4 py-3 text-sm text-emerald">
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Si un compte existe avec <strong className="font-semibold">{email}</strong>, un e-mail vient de partir. Le lien
              est valable une heure.
            </span>
          </p>
          <p className="mt-4 text-sm text-ink-soft">
            Rien reçu ? Regarde dans tes indésirables, ou{' '}
            <button
              type="button"
              onClick={() => setSent(false)}
              className="font-semibold text-azure underline underline-offset-4 hover:text-night"
            >
              réessaie avec une autre adresse
            </button>
            .
          </p>
        </div>
      ) : (
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
          <FormError>{error}</FormError>
          <SubmitButton loading={submitting} loadingLabel="Envoi…">
            Recevoir le lien
          </SubmitButton>
        </form>
      )}

      <div className="mt-8 rounded-xl border border-parchment-300/80 bg-parchment/60 px-4 py-3 text-center text-sm text-ink-soft">
        Ça te revient ?{' '}
        <Link to="/connexion" className="font-bold text-azure underline-offset-4 hover:text-night hover:underline">
          Retour à la connexion
        </Link>
      </div>
    </AuthLayout>
  );
}

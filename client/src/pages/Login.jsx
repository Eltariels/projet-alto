import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { usePageTitle } from '../lib/usePageTitle.js';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout, { Field, FormError, PasswordField, SubmitButton } from '../components/AuthLayout.jsx';
import { ArrowIcon } from '../components/Icons.jsx';

export default function Login() {
  usePageTitle('Connexion');
  const { user, login } = useAuth();
  const { state } = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Retour à la page demandée avant la connexion, sinon aux offres
  if (user) return <Navigate to={state?.from || '/offres'} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.details?.[0]?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Connexion"
      title="Bon retour"
      subtitle="Retrouve tes offres classées et le suivi de tes candidatures."
      aside={
        <>
          Content de te revoir <span className="text-gold-gradient">sur ALTO</span>
        </>
      }
    >
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(error)}
        />
        <p className="-mt-2 text-right">
          <Link
            to="/mot-de-passe-oublie"
            className="text-sm font-semibold text-azure underline-offset-4 hover:text-night hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </p>
        <FormError>{error}</FormError>
        <SubmitButton loading={submitting} loadingLabel="Connexion…">
          Me connecter <ArrowIcon className="h-4 w-4" />
        </SubmitButton>
      </form>

      <div className="mt-8 rounded-xl border border-parchment-300/80 bg-parchment/60 px-4 py-3 text-center text-sm text-ink-soft">
        Pas encore de compte ?{' '}
        <Link to="/inscription" className="font-bold text-azure underline-offset-4 hover:text-night hover:underline">
          Crée-le en 2 minutes
        </Link>
      </div>
    </AuthLayout>
  );
}

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { usePageTitle } from '../lib/usePageTitle.js';
import AuthLayout, { FormError, PasswordField, PasswordStrength, SubmitButton } from '../components/AuthLayout.jsx';

export default function ResetPassword() {
  usePageTitle('Nouveau mot de passe');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validLink = /^[a-f0-9]{64}$/.test(token);
  const mismatch = confirm && confirm !== password;

  async function handleSubmit(e) {
    e.preventDefault();
    if (mismatch) return;
    setError('');
    setSubmitting(true);
    try {
      // Le serveur ouvre la session : on arrive directement dans l'espace étudiant
      const { user } = await api.post('/auth/reset-password', { token, password });
      setUser(user);
      navigate('/offres', { replace: true, state: { passwordReset: true } });
    } catch (err) {
      setError(err.details?.[0]?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Nouveau mot de passe"
      title="Choisis un mot de passe"
      subtitle="8 caractères minimum. Tu seras connecté juste après."
      aside={
        <>
          Retrouve l'accès à <span className="text-gold-gradient">ton compte</span>
        </>
      }
    >
      {!validLink ? (
        <div>
          <FormError>Ce lien est incomplet ou abîmé. Copie-le en entier depuis l'e-mail, ou refais une demande.</FormError>
          <Link to="/mot-de-passe-oublie" className="btn-gold mt-5 w-full">
            Refaire une demande
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <PasswordField
            label="Nouveau mot de passe"
            autoComplete="new-password"
            required
            minLength={8}
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          >
            <PasswordStrength value={password} />
          </PasswordField>
          <PasswordField
            label="Confirme-le"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={Boolean(mismatch)}
            hint={mismatch ? 'Les deux mots de passe ne sont pas identiques.' : undefined}
          />
          <FormError>{error}</FormError>
          {error && (
            <Link to="/mot-de-passe-oublie" className="block text-sm font-semibold text-azure underline underline-offset-4">
              Refaire une demande
            </Link>
          )}
          <SubmitButton loading={submitting} loadingLabel="Enregistrement…">
            Enregistrer et me connecter
          </SubmitButton>
        </form>
      )}
    </AuthLayout>
  );
}

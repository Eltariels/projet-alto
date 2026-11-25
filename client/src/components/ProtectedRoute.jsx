import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { homeFor } from '../lib/roles.js';
import { SpinnerIcon } from './Icons.jsx';

export function PageLoader({ label = 'Chargement…' }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3 text-ink-soft" role="status">
      <SpinnerIcon className="h-5 w-5 animate-spin text-gold" /> {label}
    </div>
  );
}

// roles : les comptes admis. Les autres retrouvent leur propre espace (une entreprise qui ouvre /offres, par exemple).
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  // On garde la page demandée pour y revenir après la connexion
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
      <Outlet />
    </div>
  );
}

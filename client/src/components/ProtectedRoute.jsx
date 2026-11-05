import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { SpinnerIcon } from './Icons.jsx';

export function PageLoader({ label = 'Chargement…' }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3 text-ink-soft" role="status">
      <SpinnerIcon className="h-5 w-5 animate-spin text-gold" /> {label}
    </div>
  );
}

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  // On garde la page demandée pour y revenir après la connexion
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname + location.search }} />;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
      <Outlet />
    </div>
  );
}

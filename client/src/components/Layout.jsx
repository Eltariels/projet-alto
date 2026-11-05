import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import { Divider, Logo } from './Ornament.jsx';
import { BriefcaseIcon, ListIcon, UserIcon } from './Icons.jsx';

const APP_LINKS = [
  { to: '/offres', label: 'Offres', icon: BriefcaseIcon },
  { to: '/candidatures', label: 'Candidatures', icon: ListIcon },
  { to: '/profil', label: 'Profil', icon: UserIcon },
];

// Lien de navigation avec un filet or qui se déploie sous l'élément actif
const navClass = ({ isActive }) =>
  `relative py-1 text-sm font-semibold transition after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-center after:bg-gold after:transition-transform after:duration-300 ${
    isActive
      ? 'text-gold-light after:scale-x-100'
      : 'text-parchment/75 after:scale-x-0 hover:text-parchment hover:after:scale-x-100'
  }`;

// Sur téléphone, l'espace étudiant se parcourt avec une barre d'onglets au pouce
function MobileTabBar() {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/25 bg-night/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
    >
      <ul className="grid grid-cols-3">
        {APP_LINKS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${
                  isActive ? 'text-gold-light' : 'text-parchment/60 active:text-parchment'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute top-0 h-0.5 w-10 rounded-b-full bg-gold transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}
                    aria-hidden="true"
                  />
                  <Icon className="h-5 w-5" />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Layout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Chaque nouvelle page repart du haut
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={`flex min-h-screen flex-col ${user ? 'pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0' : ''}`}>
      <a
        href="#contenu"
        className="sr-only z-50 rounded-lg bg-gold px-4 py-2 font-semibold text-night focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
      >
        Aller au contenu
      </a>

      <header
        className={`sticky top-0 z-30 border-b transition-[background-color,border-color,box-shadow] duration-300 ${
          scrolled
            ? 'border-gold/25 bg-night/90 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.5)] backdrop-blur-md'
            : 'border-gold/10 bg-night'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="ALTO, accueil" className="shrink-0 rounded-md">
            <Logo />
          </Link>
          {user ? (
            <nav className="hidden gap-7 sm:flex" aria-label="Navigation principale">
              {APP_LINKS.map((l) => (
                <NavLink key={l.to} to={l.to} className={navClass}>
                  {l.label}
                </NavLink>
              ))}
            </nav>
          ) : (
            <nav className="flex items-center gap-5" aria-label="Navigation principale">
              <NavLink to="/connexion" className={navClass}>Connexion</NavLink>
              {pathname !== '/inscription' && (
                <Link to="/inscription" className="btn-gold hidden px-4 py-2 text-sm sm:inline-flex">
                  Créer mon compte
                </Link>
              )}
            </nav>
          )}
        </div>
      </header>

      <main id="contenu" className="flex-1" tabIndex={-1}>
        {/* La clé réinitialise le filet d'erreur quand on change de page */}
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <footer className="bg-night-900 text-parchment/60">
        <Divider className="opacity-60" />
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.4fr_1fr] sm:px-6">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed">
              L'alternance, sans les fausses annonces. Des offres vérifiées, un score de compatibilité et ta
              candidature en un clic.
            </p>
          </div>
          <nav className="flex flex-col gap-2 text-sm sm:items-end" aria-label="Liens du pied de page">
            <span className="eyebrow mb-1 text-gold-light/80">Ton espace</span>
            {user ? (
              <>
                <Link to="/offres" className="transition hover:text-gold-light">Offres</Link>
                <Link to="/candidatures" className="transition hover:text-gold-light">Mes candidatures</Link>
                <Link to="/profil" className="transition hover:text-gold-light">Mon profil</Link>
              </>
            ) : (
              <>
                <Link to="/inscription" className="transition hover:text-gold-light">Créer mon compte</Link>
                <Link to="/connexion" className="transition hover:text-gold-light">Me connecter</Link>
              </>
            )}
          </nav>
        </div>
        <div className="border-t border-white/5">
          <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-parchment/40 sm:px-6">© {new Date().getFullYear()} ALTO</p>
        </div>
      </footer>

      {user && <MobileTabBar />}
    </div>
  );
}

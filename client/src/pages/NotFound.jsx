import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Divider, Eyebrow } from '../components/Ornament.jsx';
import { ArrowIcon } from '../components/Icons.jsx';
import { usePageTitle } from '../lib/usePageTitle.js';

export default function NotFound() {
  usePageTitle('Page introuvable');
  const { user } = useAuth();

  return (
    <section className="bg-night-sky relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden text-parchment">
      <div className="stardust absolute inset-0" aria-hidden="true" />
      <svg viewBox="0 0 200 200" className="absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 text-gold/10" aria-hidden="true">
        <path d="M100 4 196 100 100 196 4 100Z" fill="none" stroke="currentColor" />
        <path d="M100 30 170 100 100 170 30 100Z" fill="none" stroke="currentColor" />
      </svg>
      <div className="animate-rise relative mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <Eyebrow tone="light">Erreur 404</Eyebrow>
        <p className="mt-4 font-display text-7xl font-bold text-gold-gradient sm:text-8xl">404</p>
        <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Cette page s'est égarée</h1>
        <Divider className="mx-auto mt-6 max-w-48" />
        <p className="mt-6 text-parchment/70">L'adresse n'existe pas ou a changé. Pas de panique, on te ramène sur le bon chemin.</p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to={user ? '/offres' : '/'} className="btn-gold group">
            {user ? 'Voir mes offres' : "Retour à l'accueil"}
            <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

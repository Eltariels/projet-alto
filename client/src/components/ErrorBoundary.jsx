import { Component } from 'react';
import { Link } from 'react-router-dom';
import { Corners } from './Ornament.jsx';

// Une erreur dans une page ne doit pas laisser un écran blanc : on affiche un message et un moyen d'en sortir
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Erreur d’affichage :', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <div className="card-parchment relative px-6 py-12 text-center">
          <Corners className="text-gold/40" size="h-5 w-5" inset="0.75rem" />
          <p className="font-display text-2xl font-bold text-night">Oups, cette page a trébuché</p>
          <p className="mx-auto mt-3 max-w-sm text-ink-soft">
            Un problème d'affichage est survenu. Recharge la page ; si ça recommence, reviens à l'accueil.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={() => window.location.reload()} className="btn-gold">
              Recharger la page
            </button>
            <Link to="/" onClick={() => this.setState({ error: null })} className="btn-ghost-dark">
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

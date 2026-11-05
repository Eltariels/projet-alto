import { useState } from 'react';
import { api } from '../lib/api.js';
import { StarIcon } from './Icons.jsx';

// Étoile « mettre de côté » : mise à jour immédiate, annulée si le serveur refuse
export default function FavoriteButton({ offerId, initial, onChange, className = '', withLabel = false }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const next = !on;
    setOn(next);
    setBusy(true);
    try {
      if (next) await api.put(`/offers/${offerId}/favori`);
      else await api.del(`/offers/${offerId}/favori`);
      onChange?.(next);
    } catch {
      setOn(!next);
    } finally {
      setBusy(false);
    }
  }

  const label = on ? 'Retirer des favoris' : 'Mettre en favori';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={withLabel ? undefined : label}
      title={label}
      className={`inline-flex items-center gap-2 rounded-lg transition ${
        on ? 'text-gold-dark' : 'text-ink-soft hover:text-gold-dark'
      } ${className}`}
    >
      <StarIcon filled={on} className={`h-5 w-5 transition-transform ${on ? 'scale-110' : ''}`} />
      {withLabel && <span className="text-sm font-semibold">{on ? 'En favori' : 'Mettre en favori'}</span>}
    </button>
  );
}

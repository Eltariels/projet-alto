import { useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { CrossIcon, FileIcon, SpinnerIcon } from './Icons.jsx';

const CV_MAX = 4 * 1024 * 1024; // limite de Vercel : 4,5 Mo par requête

const formatSize = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} Ko`
    : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;

// Dépôt du CV PDF : envoyé dès qu'il est choisi, indépendamment du bouton « Enregistrer »
export function CvUpload({ cv, onChange }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  async function send(file) {
    setError('');
    if (!file) return;
    if (file.type && file.type !== 'application/pdf') return setError('Choisis un fichier PDF.');
    if (file.size > CV_MAX) return setError('Fichier trop lourd : 4 Mo maximum.');
    const fd = new FormData();
    fd.append('cv', file);
    setBusy(true);
    try {
      onChange((await api.post('/profile/cv', fd)).cv);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  async function remove() {
    setError('');
    setBusy(true);
    try {
      await api.del('/profile/cv');
      onChange(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const picker = (
    <input
      ref={input}
      type="file"
      accept="application/pdf,.pdf"
      className="sr-only"
      onChange={(e) => send(e.target.files?.[0])}
      aria-label="Choisir un CV au format PDF"
    />
  );

  return (
    <div>
      {cv ? (
        <div className="flex flex-col gap-3 rounded-xl border border-parchment-300 bg-white p-4 sm:flex-row sm:items-center">
          {/* Icône et nom toujours côte à côte ; les actions passent dessous sur mobile, en trois colonnes égales */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ruby/10 text-ruby">
              <FileIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-night" title={cv.name}>
                {cv.name}
              </p>
              <p className="text-xs text-ink-soft">
                PDF · {formatSize(cv.size)} · déposé le {new Date(cv.uploadedAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:flex sm:shrink-0">
            <a
              href="/api/profile/cv"
              className="rounded-lg border border-parchment-300 px-1.5 py-2 text-[13px] font-semibold whitespace-nowrap sm:px-3 sm:py-1.5 sm:text-sm text-azure transition hover:border-gold hover:text-night"
            >
              Télécharger
            </a>
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className="rounded-lg border border-parchment-300 px-1.5 py-2 text-[13px] font-semibold whitespace-nowrap sm:px-3 sm:py-1.5 sm:text-sm text-night transition hover:border-gold"
            >
              Remplacer
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="rounded-lg px-1.5 py-2 text-[13px] font-semibold whitespace-nowrap text-ink-soft sm:px-3 sm:py-1.5 sm:text-sm transition hover:bg-ruby/5 hover:text-ruby"
            >
              {busy ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : 'Supprimer'}
            </button>
          </div>
          {picker}
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            send(e.dataTransfer.files?.[0]);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition ${
            dragging ? 'border-gold bg-gold/10' : 'border-parchment-300 bg-white/60 hover:border-gold/70 hover:bg-white'
          }`}
        >
          {busy ? (
            <SpinnerIcon className="h-7 w-7 animate-spin text-gold" />
          ) : (
            <FileIcon className="h-7 w-7 text-gold-dark" />
          )}
          <span className="text-sm font-semibold text-night">
            {busy ? 'Envoi du CV…' : 'Dépose ton CV ici ou choisis un fichier'}
          </span>
          <span className="text-xs text-ink-soft">PDF uniquement, 4 Mo maximum</span>
          {picker}
        </label>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-ruby">
          {error}
        </p>
      )}
    </div>
  );
}

// Bloc de formulaire : titre, aide, contenu
export function FieldGroup({ label, hint, htmlFor, done, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-bold text-night">
          {label}
        </label>
        {done && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald">
            <span className="h-1.5 w-1.5 rotate-45 bg-emerald" aria-hidden="true" /> Renseigné
          </span>
        )}
      </div>
      {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

// Choix unique présenté en pastilles
export function ChoicePills({ options, value, onChange, name }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active ? null : opt.value)}
            className={`rounded-lg border px-3.5 py-2 text-sm font-semibold transition ${
              active
                ? 'border-gold bg-night text-gold-light shadow-[0_6px_14px_-8px_rgb(15_27_51/0.7)]'
                : 'border-parchment-300 bg-white text-ink-soft hover:border-gold/60 hover:text-night'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// Saisie d'étiquettes : Entrée ou virgule pour ajouter, Retour arrière pour enlever la dernière
export function TagInput({ id, value, onChange, suggestions = [], max = 20, placeholder }) {
  const [draft, setDraft] = useState('');
  const has = (t) => value.some((v) => v.toLowerCase() === t.toLowerCase());

  // Seule la virgule sépare les compétences : « web,design, html » donne 3 pastilles,
  // « développement-front » en reste une seule. Tout est ajouté en une fois, sans doublon.
  function add(raw) {
    const next = [...value];
    for (const part of raw.split(',')) {
      const tag = part.trim().slice(0, 40);
      if (tag && next.length < max && !next.some((v) => v.toLowerCase() === tag.toLowerCase())) next.push(tag);
    }
    if (next.length !== value.length) onChange(next);
  }

  // Une virgule tapée ou collée valide tout ce qui la précède ; le reste reste en cours de saisie
  function handleChange(text) {
    if (!text.includes(',')) return setDraft(text);
    const cut = text.lastIndexOf(',');
    add(text.slice(0, cut));
    setDraft(text.slice(cut + 1).trimStart());
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      add(draft);
      setDraft('');
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  const remaining = suggestions.filter((s) => !has(s));

  return (
    <div>
      <div className="field flex min-h-12 flex-wrap items-center gap-1.5 px-2 py-2 focus-within:border-gold focus-within:ring-4 focus-within:ring-gold/20">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md border border-azure/20 bg-azure/8 py-1 pl-2.5 pr-1 text-sm font-semibold text-azure"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== tag))}
              className="rounded p-0.5 text-azure/60 transition hover:bg-azure/10 hover:text-azure"
              aria-label={`Retirer ${tag}`}
            >
              <CrossIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            add(draft);
            setDraft('');
          }}
          placeholder={value.length ? '' : placeholder}
          disabled={value.length >= max}
          enterKeyHint="enter"
          className="min-w-32 flex-1 bg-transparent px-1.5 py-1 outline-none placeholder:text-ink-soft/45"
        />
      </div>

      {remaining.length > 0 && value.length < max && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-ink-soft">Suggestions :</span>
          {remaining.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-md border border-dashed border-parchment-300 px-2 py-0.5 text-xs font-semibold text-ink-soft transition hover:border-gold hover:text-night"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

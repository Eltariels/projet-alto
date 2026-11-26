import { useEffect, useRef, useState } from 'react';

// Colonnes par jour, en SVG, sans bibliothèque : une série, ou plusieurs empilées.
// Règles de lecture : colonnes fines (24 px au plus), coins hauts arrondis, 2 px de fond entre deux segments,
// grille en filets pleins, une seule valeur écrite sur le graphique (le jour le plus haut), le reste au survol,
// au clavier (flèches) et dans le tableau des données.

const PLOT_H = 190;
const TOP = 20; // place de la valeur écrite au-dessus de la plus haute colonne
const AXIS_H = 26; // bande des dates, comprise dans la hauteur
const LEFT = 34; // place des graduations
const GAP = 2;
const GRID = '#ebdfc6';
const BASELINE = '#dccaa6';
const INK_SOFT = '#545c6d';

const asDate = (day) => new Date(`${day}T12:00:00`);
export const shortDay = (day) => asDate(day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const longDay = (day) => asDate(day).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const fmt = (n) => n.toLocaleString('fr-FR');

// Graduations rondes : 0, 1, 2… pour de petits nombres, puis par 2, 5, 10, 20…
function niceScale(max) {
  if (max <= 4) return { top: Math.max(1, max), step: 1 };
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw);
  return { top: Math.ceil(max / step) * step, step };
}

// Colonne aux coins hauts arrondis (4 px), carrée sur la ligne de base
function topRounded(x, y, w, h, r = 4) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

// series : [{ key, label, unit: [singulier, pluriel], color, values }]
export default function ColumnChart({ days, series, label }) {
  const wrap = useRef(null);
  const [width, setWidth] = useState(560);
  const [active, setActive] = useState(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = days.length;
  const stacked = series.length > 1;
  const totals = days.map((_, i) => series.reduce((t, s) => t + (s.values[i] || 0), 0));
  const max = Math.max(0, ...totals);
  const { top, step } = niceScale(max);
  const plotW = width - LEFT - 6;
  const band = plotW / n;
  const barW = Math.max(3, Math.min(24, band * 0.6));
  const y = (v) => TOP + PLOT_H - (v / top) * PLOT_H;
  const cx = (i) => LEFT + i * band + band / 2;
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  // Une date toutes les « every » colonnes en partant d'aujourd'hui, pour que les libellés ne se touchent pas
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 62))));
  const peak = max > 0 ? totals.lastIndexOf(max) : -1;
  const height = TOP + PLOT_H + AXIS_H;

  function onKeyDown(e) {
    const moves = { ArrowLeft: -1, ArrowRight: 1 };
    if (e.key in moves) {
      e.preventDefault();
      setActive((a) => Math.min(n - 1, Math.max(0, (a ?? n - 1) + moves[e.key])));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setActive(e.key === 'Home' ? 0 : n - 1);
    }
  }

  const tipLeft = active == null ? 0 : Math.min(Math.max(cx(active), 80), width - 80);

  return (
    <div>
      {stacked && (
        <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} aria-hidden="true" />
              {s.label}
            </li>
          ))}
        </ul>
      )}

      <div ref={wrap} className="relative w-full min-w-0">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${label}. Flèches gauche et droite pour lire chaque jour.`}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onFocus={() => setActive((a) => a ?? n - 1)}
          onBlur={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
          className="block rounded-md outline-offset-4"
        >
          {ticks.map((v) => (
            <g key={v}>
              <line x1={LEFT} x2={width - 6} y1={y(v)} y2={y(v)} stroke={v === 0 ? BASELINE : GRID} strokeWidth="1" />
              <text x={LEFT - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill={INK_SOFT} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {fmt(v)}
              </text>
            </g>
          ))}

          {days.map((day, i) => {
            const x = cx(i) - barW / 2;
            const dim = active != null && active !== i;
            const parts = series.map((s) => ({ key: s.key, color: s.color, v: s.values[i] || 0 })).filter((p) => p.v > 0);
            let acc = 0;
            return (
              <g key={day} opacity={dim ? 0.45 : 1} style={{ transition: 'opacity 120ms' }}>
                {parts.map((p, j) => {
                  const last = j === parts.length - 1;
                  const yTop = y(acc + p.v);
                  const yBottom = y(acc);
                  acc += p.v;
                  if (last) return <path key={p.key} d={topRounded(x, yTop, barW, yBottom - yTop)} fill={p.color} />;
                  // Segment du dessous : 2 px de fond le séparent du suivant
                  const h = Math.max(1, yBottom - yTop - GAP);
                  return <rect key={p.key} x={x} y={yBottom - h} width={barW} height={h} fill={p.color} />;
                })}
                {(n - 1 - i) % every === 0 && (
                  <text
                    x={i === n - 1 ? Math.min(cx(i) + barW / 2, width - 6) : cx(i)}
                    y={TOP + PLOT_H + 17}
                    textAnchor={i === n - 1 ? 'end' : 'middle'}
                    fontSize="11"
                    fill={INK_SOFT}
                  >
                    {shortDay(day)}
                  </text>
                )}
                {/* Zone de survol : toute la largeur du jour, pas seulement la colonne */}
                <rect
                  x={LEFT + i * band}
                  y={TOP}
                  width={band}
                  height={PLOT_H}
                  fill="transparent"
                  onPointerEnter={() => setActive(i)}
                  onPointerMove={() => setActive(i)}
                />
              </g>
            );
          })}

          {peak >= 0 && active == null && (
            <text x={cx(peak)} y={y(max) - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1c2333">
              {fmt(max)}
            </text>
          )}
        </svg>

        {active != null && (
          <div
            className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-full rounded-lg border border-parchment-300 bg-white px-3 py-2 text-xs shadow-[0_10px_24px_-12px_rgb(15_27_51/0.5)]"
            style={{ left: tipLeft, top: Math.max(4, y(totals[active]) - 10) }}
            role="status"
          >
            <p className="text-ink-soft first-letter:uppercase">{longDay(days[active])}</p>
            {series.map((s) => (
              <p key={s.key} className="mt-1 flex items-center gap-2">
                <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                <strong className="text-sm text-night">{fmt(s.values[active] || 0)}</strong>
                <span className="text-ink-soft">{(s.values[active] || 0) > 1 ? s.unit[1] : s.unit[0]}</span>
              </p>
            ))}
            {stacked && (
              <p className="mt-1 border-t border-parchment-200 pt-1 text-ink-soft">
                Total <strong className="text-night">{fmt(totals[active])}</strong>
              </p>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowTable((v) => !v)}
        aria-expanded={showTable}
        className="mt-3 text-xs font-semibold text-azure underline-offset-4 hover:underline"
      >
        {showTable ? 'Masquer les données' : 'Voir les données'}
      </button>
      {showTable && (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-parchment-300">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-parchment-200 text-ink-soft">
              <tr>
                <th className="px-3 py-2 font-semibold">Jour</th>
                {series.map((s) => (
                  <th key={s.key} className="px-3 py-2 text-right font-semibold">
                    {s.label}
                  </th>
                ))}
                {stacked && <th className="px-3 py-2 text-right font-semibold">Total</th>}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[...days.keys()].reverse().map((i) => (
                <tr key={days[i]} className="border-t border-parchment-200">
                  <td className="px-3 py-1.5 text-ink">{longDay(days[i])}</td>
                  {series.map((s) => (
                    <td key={s.key} className="px-3 py-1.5 text-right text-night">
                      {fmt(s.values[i] || 0)}
                    </td>
                  ))}
                  {stacked && <td className="px-3 py-1.5 text-right font-semibold text-night">{fmt(totals[i])}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

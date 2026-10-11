// Piezas de interfaz reutilizables (devuelven HTML).
import { esc, dShort } from '../core/utils.js';
import { S, cat, acc, catsOf } from '../core/store.js';
import { money, signed } from '../core/format.js';

let guillocheCache = '';
/** Trama ondulada tipo billete para la tarjeta de saldo (se calcula una sola vez). */
export function guilloche() {
  if (guillocheCache) return guillocheCache;
  let p = '';
  for (let k = 0; k < 13; k++) {
    let d = `M0 ${14 + k * 9}`;
    for (let x = 0; x <= 400; x += 6) {
      const y = 14 + k * 9 + Math.sin(x / 30 + k * 0.55) * 11 + Math.sin(x / 9 + k * 1.3) * 2.4;
      d += ` L${x} ${y.toFixed(1)}`;
    }
    p += `<path d="${d}"/>`;
  }
  return (guillocheCache = `<svg class="guil" viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="#fff" stroke-width=".7">${p}</g></svg>`);
}

export function sparkline(vals, w = 300, h = 46) {
  if (vals.length < 2) return '';
  const mn = Math.min(...vals), mx = Math.max(...vals), r = mx - mn || 1;
  const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * w).toFixed(1)},${(h - 4 - ((v - mn) / r) * (h - 8)).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
}

const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17 19 7"/></svg>';
const TRANSFER_CAT = { icon: '⇄', color: '#4F6D8F', name: 'Transferencia' };
const NO_CAT = { icon: '❔', color: '#6C7A89', name: 'Sin categoría' };
export const catOrDefault = m => (m.type === 'transfer' ? TRANSFER_CAT : cat(m.categoryId) || NO_CAT);
export const amountClass = t => (t === 'income' ? 'pos' : t === 'expense' ? 'neg' : 'mut');

export function movRow(m, opts = {}) {
  const c = catOrDefault(m), a = acc(m.accountId), to = acc(m.toAccountId);
  const title = m.description || c.name;
  const sub = m.type === 'transfer'
    ? `${a?.name || '¿?'} a ${to?.name || '¿?'}`
    : [m.description ? c.name : '', a?.name || '', opts.showDate ? dShort(m.date) : ''].filter(Boolean).join(', ');
  return `<div class="mv" role="button" tabindex="0" data-act="edit" data-id="${m.id}">
    <span class="ic" style="--c:${esc(c.color)}">${esc(c.icon)}</span>
    <span class="t"><b>${esc(title)}</b><small>${esc(sub)}${m.recurringId ? ' ↻' : ''}</small></span>
    <span class="a"><span class="amt ${amountClass(m.type)}">${signed(m.amount, m.type)}</span></span>
    <button class="rev" data-act="review" data-id="${m.id}" aria-pressed="${!!m.reviewed}" aria-label="${m.reviewed ? 'Revisado' : 'Marcar como revisado'}" title="${m.reviewed ? 'Revisado' : 'Marcar como revisado'}">${CHECK}</button>
  </div>`;
}

export const emptyState = (title, text, btn = true) =>
  `<div class="empty"><b>${title}</b>${text}${btn ? '<div><button class="btn primary" data-act="add">Añadir movimiento</button></div>' : ''}</div>`;

export function budRow(b) {
  const st = b.pct >= 100 ? 'over' : b.pct >= S.settings.alertPct ? 'warn' : '';
  return `<div class="bud"><div class="top"><b>${esc(b.icon || '')} ${esc(b.label)}</b><span class="num">${money(b.spent)} <span class="mut">/ ${money(b.limit)}</span></span></div>
  <div class="bar ${st}"><i style="width:${Math.min(100, b.pct)}%"></i></div>
  <div class="mut" style="font-size:12.5px;margin-top:5px">${b.spent <= b.limit ? `Quedan ${money(b.limit - b.spent)}` : `Excedido en ${money(b.spent - b.limit)}`}, ${b.pct} %</div></div>`;
}

export const accOptions = sel => S.accounts.map(a => `<option value="${a.id}" ${a.id === sel ? 'selected' : ''}>${esc(a.name)}</option>`).join('');
export const catOptions = (type, sel) => catsOf(type).map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.icon)} ${esc(c.name)}</option>`).join('');
export const options = (pairs, sel) => pairs.map(([v, l]) => `<option value="${v}" ${String(sel) === String(v) ? 'selected' : ''}>${l}</option>`).join('');

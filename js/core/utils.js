// Utilidades generales: DOM, fechas, importes.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = p => (p || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const pad = n => String(n).padStart(2, '0');

/* Fechas (formato ISO local YYYY-MM-DD) */
export const isoD = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => isoD(new Date());
export const ymOf = s => s.slice(0, 7);
export const ymNow = () => today().slice(0, 7);
export const addMonths = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
export const daysIn = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
export const addDays = (s, n) => { const d = new Date(s + 'T00:00'); d.setDate(d.getDate() + n); return isoD(d); };
export const nextDay = s => addDays(s, 1);
export const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 864e5);
export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MSHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const ymLabel = ym => { const [y, m] = ym.split('-'); return `${MONTHS[m - 1]} ${y}`; };
export const ymShort = ym => { const [y, m] = ym.split('-'); return `${MSHORT[m - 1]} ${y.slice(2)}`; };
export const dLabel = s => {
  const t = today();
  if (s === t) return 'Hoy';
  if (s === addDays(t, -1)) return 'Ayer';
  return new Date(s + 'T00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
};
export const dShort = s => new Date(s + 'T00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
export const dLong = s => new Date(s + 'T00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
export const weekStart = s => { const d = new Date(s + 'T00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoD(d); };
export function monthsBetween(a, b) {
  const out = []; let ym = ymOf(a); const end = ymOf(b); let g = 0;
  while (ym <= end && g++ < 240) { out.push(ym); ym = addMonths(ym, 1); }
  return out;
}

/* Importes: siempre en céntimos enteros para no perder precisión */
export function parseAmount(v) {
  if (v == null) return NaN;
  let s = String(v).trim().replace(/[€$£\s\u00a0]/g, '');
  if (!s) return NaN;
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else s = s.replace(',', '.');
  const n = Number(s);
  return isFinite(n) ? Math.round(n * 100) : NaN;
}
export const centsToInput = c => (c / 100).toFixed(2).replace('.', ',');
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

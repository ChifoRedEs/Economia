// Cálculos financieros. Usa un índice en caché (por mes y saldo acumulado por fecha)
// que se reconstruye solo cuando cambian los datos.
import { S, rev, acc, cat, save } from './store.js';
import { ymOf, ymNow, today, addMonths, daysIn, pad, uid, pct } from './utils.js';

let builtRev = -1, I = null;
function index() {
  if (I && builtRev === rev) return I;
  const byMonth = new Map(), net = new Map();
  for (const m of S.movements) {
    const ym = ymOf(m.date);
    if (!byMonth.has(ym)) byMonth.set(ym, []);
    byMonth.get(ym).push(m);
    if (m.type !== 'transfer') net.set(m.date, (net.get(m.date) || 0) + (m.type === 'income' ? m.amount : -m.amount));
  }
  const dates = [...net.keys()].sort(), cum = [];
  let run = 0;
  for (const d of dates) { run += net.get(d); cum.push(run); }
  I = { byMonth, dates, cum, net };
  builtRev = rev;
  return I;
}

export function sortedMovs(list = S.movements, dir = 'desc') {
  const k = dir === 'desc' ? -1 : 1;
  return [...list].sort((a, b) => (a.date < b.date ? -k : a.date > b.date ? k : ((a.created || 0) - (b.created || 0)) * k));
}
export function totals(list) {
  let inc = 0, exp = 0;
  for (const m of list) { if (m.type === 'income') inc += m.amount; else if (m.type === 'expense') exp += m.amount; }
  return { inc, exp, net: inc - exp };
}
/** Movimientos de un mes (no modificar el array devuelto). */
export const monthMovs = ym => index().byMonth.get(ym) || [];
export const rangeMovs = (a, b) => S.movements.filter(m => m.date >= a && m.date <= b);
/** Neto (ingresos - gastos) de un día concreto. */
export const dayNet = d => index().net.get(d) || 0;

export function accBalance(id, before) {
  const a = acc(id); let b = a ? Number(a.initial) || 0 : 0;
  for (const m of S.movements) {
    if (before && m.date >= before) continue;
    if (m.type === 'income' && m.accountId === id) b += m.amount;
    else if (m.type === 'expense' && m.accountId === id) b -= m.amount;
    else if (m.type === 'transfer') { if (m.accountId === id) b -= m.amount; if (m.toAccountId === id) b += m.amount; }
  }
  return b;
}
/** Saldo total de todas las cuentas antes de la fecha `before` (exclusiva) o actual. */
export function totalBalance(before) {
  const base = S.accounts.reduce((s, a) => s + (Number(a.initial) || 0), 0);
  const { dates, cum } = index();
  if (!dates.length) return base;
  if (!before) return base + cum[cum.length - 1];
  let lo = 0, hi = dates.length - 1, pos = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (dates[mid] < before) { pos = mid; lo = mid + 1; } else hi = mid - 1; }
  return base + (pos >= 0 ? cum[pos] : 0);
}
export function sumByCat(list, type) {
  const map = new Map();
  for (const m of list) if (m.type === type) map.set(m.categoryId || '_none', (map.get(m.categoryId || '_none') || 0) + m.amount);
  return [...map.entries()]
    .map(([id, total]) => ({ id, total, c: cat(id) || { name: 'Sin categoría', icon: '❔', color: '#6C7A89' } }))
    .sort((a, b) => b.total - a.total);
}
export function budgetStatus(ym) {
  const out = [], mm = monthMovs(ym);
  if (S.budgets.global > 0) {
    const spent = totals(mm).exp;
    out.push({ label: 'Presupuesto global', icon: '🎯', limit: S.budgets.global, spent, pct: pct(spent, S.budgets.global) });
  }
  for (const [cid, limit] of Object.entries(S.budgets.cats)) {
    const c = cat(cid); if (!c || !(limit > 0)) continue;
    const spent = mm.reduce((s, m) => s + (m.type === 'expense' && m.categoryId === cid ? m.amount : 0), 0);
    out.push({ label: c.name, icon: c.icon, color: c.color, limit, spent, pct: pct(spent, limit), cid });
  }
  return out;
}

/* Recurrentes */
export function dueRecurring() {
  const out = [], t = today(), end = ymNow();
  for (const r of S.recurring) {
    if (!r.active) continue;
    let ym = r.start || end, g = 0;
    while (ym <= end && g++ < 240) {
      const date = `${ym}-${pad(Math.min(Number(r.day) || 1, daysIn(ym)))}`;
      if (date <= t) {
        const done = S.movements.some(m => m.recurringId === r.id && ymOf(m.date) === ym) || (r.skipped || []).includes(ym);
        if (!done) out.push({ r, ym, date });
      }
      ym = addMonths(ym, 1);
    }
  }
  return out;
}
export const movFromRec = (r, date) => ({
  id: uid('m_'), type: r.type, amount: r.amount, date, categoryId: r.categoryId, accountId: r.accountId,
  method: r.method || 'domiciliacion', description: r.description, reviewed: false, recurringId: r.id, created: Date.now()
});
/** Registra los recurrentes automáticos pendientes y devuelve cuántos se han añadido. */
export function processRecurring() {
  let n = 0;
  for (const d of dueRecurring()) if (d.r.auto) { S.movements.push(movFromRec(d.r, d.date)); n++; }
  if (n) save();
  return n;
}

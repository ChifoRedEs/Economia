// Estado persistente (LocalStorage). `S` es un enlace vivo: los módulos que lo importan
// ven siempre el estado actual, también tras restaurar una copia o borrar los datos.
import { STORAGE_KEY, DEF_CATS } from './constants.js';

export function defaults() {
  return {
    app: 'agenda-finanzas', version: 1,
    settings: { theme: 'auto', currency: 'EUR', alertPct: 80 },
    accounts: [
      { id: 'acc_banco', name: 'Banco', type: 'banco', initial: 0, color: '#155E52' },
      { id: 'acc_efectivo', name: 'Efectivo', type: 'efectivo', initial: 0, color: '#D99A0B' }
    ],
    categories: DEF_CATS.map(([id, name, icon, type, color]) => ({ id: 'cat_' + id, name, icon, type, color })),
    movements: [], budgets: { global: null, cats: {} }, recurring: [], closed: []
  };
}

export function normalize(d) {
  const b = defaults();
  return {
    app: 'agenda-finanzas', version: 1,
    settings: { ...b.settings, ...(d.settings || {}) },
    accounts: Array.isArray(d.accounts) && d.accounts.length ? d.accounts : b.accounts,
    categories: Array.isArray(d.categories) && d.categories.length ? d.categories : b.categories,
    movements: Array.isArray(d.movements) ? d.movements : [],
    budgets: { global: d.budgets?.global ?? null, cats: { ...(d.budgets?.cats || {}) } },
    recurring: Array.isArray(d.recurring) ? d.recurring : [],
    closed: Array.isArray(d.closed) ? d.closed : []
  };
}

function load() {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return normalize(JSON.parse(raw)); }
  catch (e) { console.warn('No se pudieron leer los datos', e); }
  return defaults();
}

export let S = load();
/** Contador de revisiones: cambia en cada guardado y permite invalidar cachés de cálculo. */
export let rev = 0;

export function save() {
  rev++;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); return true; }
  catch (e) { document.dispatchEvent(new CustomEvent('store:error')); return false; }
}
export function replaceState(next) { S = next; save(); }
export function reloadFromStorage() { S = load(); rev++; }

/* Búsquedas rápidas */
export const cat = id => S.categories.find(c => c.id === id);
export const acc = id => S.accounts.find(a => a.id === id);
export const catsOf = t => S.categories.filter(c => c.type === t);
export const isClosed = ym => S.closed.includes(ym);

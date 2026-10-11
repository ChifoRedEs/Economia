// Acciones de la interfaz (delegación de eventos con atributos data-act).
import { $, $$, today, addMonths, ymNow, ymLabel, parseAmount } from './core/utils.js';
import { S, save, acc, cat, defaults, replaceState, reloadFromStorage, isClosed } from './core/store.js';
import { STORAGE_KEY } from './core/constants.js';
import { setCurrency } from './core/format.js';
import { monthMovs, movFromRec } from './core/calc.js';
import { ui, resetFilters } from './ui/state.js';
import { toast, applyTheme, confirmDlg, closeSheet, sheetOpen, confirmOpen } from './ui/dom.js';
import { render } from './ui/render.js';
import { renderMovResults } from './views/movements.js';
import { openMovSheet } from './sheets/movement.js';
import { openAccSheet, openReconcileSheet } from './sheets/account.js';
import { openCatSheet } from './sheets/category.js';
import { openRecurringSheet } from './sheets/recurring.js';
import { exportBackup, exportCSV, importFile } from './features/io.js';
import { promptInstall } from './features/pwa.js';

const findRec = id => S.recurring.find(x => x.id === id);

export const ACTIONS = {
  nav(el) {
    ui.view = el.dataset.view;
    render(); window.scrollTo(0, 0);
    if (el.dataset.anchor) setTimeout(() => document.getElementById(el.dataset.anchor)?.scrollIntoView({ behavior: 'smooth' }), 30);
  },
  add() { if (!S.accounts.length) return toast('Crea primero una cuenta en Ajustes.', 'err'); openMovSheet(); },
  edit(el, e) { if (e?.target.closest('.rev')) return; const m = S.movements.find(x => x.id === el.dataset.id); if (m) openMovSheet(m); },
  review(el, e) {
    e.stopPropagation();
    const m = S.movements.find(x => x.id === el.dataset.id); if (!m) return;
    m.reviewed = !m.reviewed; save();
    el.setAttribute('aria-pressed', m.reviewed);
    el.setAttribute('aria-label', m.reviewed ? 'Revisado' : 'Marcar como revisado');
  },

  /* Libro */
  month(el) { ui.month = addMonths(ui.month, Number(el.dataset.d)); render(); },
  monthToday() { ui.month = ymNow(); render(); },
  async closeMonth() {
    const ym = ui.month;
    if (isClosed(ym)) { S.closed = S.closed.filter(x => x !== ym); save(); render(true); return toast('Mes reabierto'); }
    if (!(await confirmDlg(`¿Cerrar ${ymLabel(ym)}?`, 'Cerrar mes', false, 'Te avisaremos si intentas modificar sus movimientos más adelante.'))) return;
    S.closed.push(ym); save(); render(true); toast('Mes cerrado');
  },
  exportMonth() { exportCSV(monthMovs(ui.month), `libro_${ui.month}.csv`); },

  /* Estadísticas y filtros */
  statsRange(el) { ui.stats.range = el.dataset.v; render(true); },
  filtersToggle(el) { ui.showFilters = !ui.showFilters; $('#filterBox').style.display = ui.showFilters ? '' : 'none'; el.setAttribute('aria-expanded', ui.showFilters); },
  filtersClear() { resetFilters(); render(true); },

  /* Recurrentes */
  recConfirm(el) { const r = findRec(el.dataset.id); if (!r) return; S.movements.push(movFromRec(r, el.dataset.date)); save(); render(true); toast('Movimiento registrado'); },
  recSkip(el) { const r = findRec(el.dataset.id); if (!r) return; r.skipped = [...(r.skipped || []), el.dataset.ym]; save(); render(true); toast('Omitido este mes'); },
  recEdit(el) { openRecurringSheet(el.dataset.id ? findRec(el.dataset.id) : null); },

  /* Ajustes */
  accEdit(el) { openAccSheet(el.dataset.id ? acc(el.dataset.id) : null); },
  accRec(el) { openReconcileSheet(acc(el.dataset.id)); },
  catEdit(el) { openCatSheet(el.dataset.id ? cat(el.dataset.id) : null); },
  catTab(el) { ui.catTab = el.dataset.v; render(true); },
  theme(el) { S.settings.theme = el.dataset.v; save(); applyTheme(); render(true); },
  saveBudgets() {
    const bad = [], cats = {}; let global = null;
    $$('[data-bud]').forEach(i => {
      const v = i.value.trim(); if (!v) return;
      const c = parseAmount(v);
      if (isNaN(c) || c < 0) return bad.push(i);
      if (i.dataset.bud === 'global') global = c || null; else if (c > 0) cats[i.dataset.bud] = c;
    });
    if (bad.length) { bad[0].focus(); return toast('Revisa los importes: hay alguno que no es un número válido.', 'err'); }
    S.budgets = { global, cats }; save(); render(true); toast('Presupuestos guardados');
  },
  install() { promptInstall(); },

  /* Datos */
  exportJSON() { exportBackup(); },
  importJSON() { const f = $('#fileIn'); f.value = ''; f.click(); },
  exportCSV() { exportCSV(S.movements, `movimientos_${today()}.csv`); },
  async wipe() {
    if (!(await confirmDlg('¿Borrar todos los datos?', 'Borrar todo', true, 'Se eliminarán movimientos, cuentas, categorías, presupuestos y recurrentes de este navegador. No se puede deshacer.'))) return;
    if (!(await confirmDlg('Confirma de nuevo', 'Sí, borrar definitivamente', true, 'Si no tienes una copia de seguridad, perderás tus datos.'))) return;
    replaceState(defaults()); setCurrency(S.settings.currency); applyTheme(); render(); toast('Datos borrados');
  }
};

export function bindEvents() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const fn = ACTIONS[el.dataset.act]; if (fn) fn(el, e);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !confirmOpen() && sheetOpen()) closeSheet();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.mv[role=button]')) { e.preventDefault(); e.target.click(); }
  });

  let timer;
  document.addEventListener('input', e => {
    const k = e.target.dataset.filter;
    if (k && k !== 'sort') { ui.f[k] = e.target.value; clearTimeout(timer); timer = setTimeout(renderMovResults, k === 'q' ? 120 : 0); }
    const st = e.target.dataset.stats;
    if (st && e.target.value) { ui.stats[st] = e.target.value; clearTimeout(timer); timer = setTimeout(() => render(true), 300); }
  });
  document.addEventListener('change', e => {
    const s = e.target.dataset.setting;
    if (s) { S.settings[s] = s === 'alertPct' ? Number(e.target.value) : e.target.value; save(); setCurrency(S.settings.currency); render(true); toast('Ajuste guardado'); }
    if (e.target.dataset.filter === 'sort') { ui.f.sort = e.target.value; renderMovResults(); }
  });

  $('#fileIn').addEventListener('change', e => { const f = e.target.files[0]; if (f) importFile(f); });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (ui.view === 'stats') render(true); });
  // Si la app está abierta en otra pestaña y cambian los datos, se sincroniza.
  window.addEventListener('storage', e => { if (e.key === STORAGE_KEY) { reloadFromStorage(); setCurrency(S.settings.currency); applyTheme(); render(true); } });
}

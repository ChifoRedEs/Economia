// Pantalla de movimientos: búsqueda, filtros y listado agrupado por día.
import { $, esc, parseAmount, centsToInput, dLabel } from '../core/utils.js';
import { S, cat, acc, catsOf } from '../core/store.js';
import { METHODS } from '../core/constants.js';
import { money, signedNet } from '../core/format.js';
import { totals, sortedMovs } from '../core/calc.js';
import { ui } from '../ui/state.js';
import { movRow, emptyState, options } from '../ui/components.js';

const MAX_ROWS = 600;
export const filtersActive = () => ['type', 'cat', 'acc', 'rev'].filter(k => ui.f[k] !== 'all').length + ['from', 'to', 'min', 'max'].filter(k => ui.f[k]).length;

export function viewMovs() {
  const f = ui.f, n = filtersActive();
  const catOpts = '<option value="all">Todas</option>' + ['expense', 'income'].map(t =>
    `<optgroup label="${t === 'expense' ? 'Gastos' : 'Ingresos'}">${catsOf(t).map(c => `<option value="${c.id}" ${f.cat === c.id ? 'selected' : ''}>${esc(c.icon)} ${esc(c.name)}</option>`).join('')}</optgroup>`).join('');
  return `
  <div class="ph"><div><h1>Movimientos</h1><p>Busca, filtra y revisa cada apunte.</p></div></div>
  <div class="toolbar">
    <input type="search" class="grow" data-filter="q" value="${esc(f.q)}" placeholder="Buscar por descripción, categoría o cuenta" aria-label="Buscar">
    <button class="btn" data-act="filtersToggle" aria-expanded="${ui.showFilters}">Filtros${n ? ` (${n})` : ''}</button>
    <select data-filter="sort" aria-label="Ordenar" style="width:auto">${options([['date-desc', 'Más recientes'], ['date-asc', 'Más antiguos'], ['amt-desc', 'Importe mayor'], ['amt-asc', 'Importe menor']], f.sort)}</select>
  </div>
  <div class="card" style="margin-top:10px;${ui.showFilters ? '' : 'display:none'}" id="filterBox">
    <div class="filters">
      <label class="field"><span class="lbl">Tipo</span><select data-filter="type">${options([['all', 'Todos'], ['expense', 'Gastos'], ['income', 'Ingresos'], ['transfer', 'Transferencias']], f.type)}</select></label>
      <label class="field"><span class="lbl">Categoría</span><select data-filter="cat">${catOpts}</select></label>
      <label class="field"><span class="lbl">Cuenta</span><select data-filter="acc"><option value="all">Todas</option>${S.accounts.map(a => `<option value="${a.id}" ${f.acc === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label>
      <label class="field"><span class="lbl">Revisión</span><select data-filter="rev">${options([['all', 'Todos'], ['yes', 'Revisados'], ['no', 'Sin revisar']], f.rev)}</select></label>
      <label class="field"><span class="lbl">Desde</span><input type="date" data-filter="from" value="${f.from}"></label>
      <label class="field"><span class="lbl">Hasta</span><input type="date" data-filter="to" value="${f.to}"></label>
      <label class="field"><span class="lbl">Importe mínimo</span><input inputmode="decimal" data-filter="min" value="${esc(f.min)}" placeholder="0,00"></label>
      <label class="field"><span class="lbl">Importe máximo</span><input inputmode="decimal" data-filter="max" value="${esc(f.max)}" placeholder="Sin límite"></label>
    </div>
    <div style="margin-top:12px"><button class="btn sm" data-act="filtersClear">Quitar filtros</button></div>
  </div>
  <div id="movResults"></div>`;
}

export function filteredMovs() {
  const f = ui.f, q = f.q.trim().toLowerCase();
  const mn = f.min ? parseAmount(f.min) : NaN, mx = f.max ? parseAmount(f.max) : NaN;
  let list = S.movements.filter(m => {
    if (f.type !== 'all' && m.type !== f.type) return false;
    if (f.cat !== 'all' && m.categoryId !== f.cat) return false;
    if (f.acc !== 'all' && m.accountId !== f.acc && m.toAccountId !== f.acc) return false;
    if (f.rev === 'yes' && !m.reviewed) return false;
    if (f.rev === 'no' && m.reviewed) return false;
    if (f.from && m.date < f.from) return false;
    if (f.to && m.date > f.to) return false;
    if (!isNaN(mn) && m.amount < mn) return false;
    if (!isNaN(mx) && m.amount > mx) return false;
    if (q) {
      const hay = [m.description, cat(m.categoryId)?.name, acc(m.accountId)?.name, acc(m.toAccountId)?.name, METHODS[m.method], centsToInput(m.amount)].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  if (f.sort === 'date-asc') list = sortedMovs(list, 'asc');
  else if (f.sort === 'amt-desc') list.sort((a, b) => b.amount - a.amount);
  else if (f.sort === 'amt-asc') list.sort((a, b) => a.amount - b.amount);
  else list = sortedMovs(list, 'desc');
  return list;
}

export function renderMovResults() {
  const box = $('#movResults'); if (!box) return;
  const list = filteredMovs(), tot = totals(list);
  let html = `<div class="toolbar" style="margin:14px 2px 10px;justify-content:space-between">
    <span class="mut">${list.length} ${list.length === 1 ? 'movimiento' : 'movimientos'}</span>
    <span class="num"><span class="pos">+${money(tot.inc)}</span>&nbsp;&nbsp;<span class="neg">−${money(tot.exp)}</span></span></div>`;
  if (!S.movements.length) html += `<div class="list">${emptyState('Aún no hay movimientos', 'Empieza registrando un gasto o un ingreso.')}</div>`;
  else if (!list.length) html += `<div class="list">${emptyState('Ningún movimiento coincide', 'Cambia la búsqueda o quita algún filtro.', false)}</div>`;
  else if (ui.f.sort.startsWith('date')) {
    const groups = []; let cur = null;
    for (const m of list.slice(0, MAX_ROWS)) { if (!cur || cur.date !== m.date) { cur = { date: m.date, items: [] }; groups.push(cur); } cur.items.push(m); }
    html += `<div class="list">${groups.map(g => `<div class="day-h"><span style="text-transform:capitalize">${dLabel(g.date)}</span><span class="num">${signedNet(totals(g.items).net)}</span></div>${g.items.map(m => movRow(m)).join('')}`).join('')}</div>`;
  } else html += `<div class="list">${list.slice(0, MAX_ROWS).map(m => movRow(m, { showDate: true })).join('')}</div>`;
  if (list.length > MAX_ROWS) html += `<p class="mut">Se muestran los ${MAX_ROWS} primeros. Usa los filtros para acotar.</p>`;
  box.innerHTML = html;
}

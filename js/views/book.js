// Libro mensual: apuntes con saldo acumulado y totales por categoría y por día.
import { esc, addMonths, ymNow, ymLabel, dShort, pct } from '../core/utils.js';
import { S, acc, isClosed } from '../core/store.js';
import { money, signed, signedNet } from '../core/format.js';
import { totals, monthMovs, sortedMovs, totalBalance, sumByCat } from '../core/calc.js';
import { ui } from '../ui/state.js';
import { emptyState, catOrDefault, amountClass } from '../ui/components.js';

const diff = (a, b) => { if (!b) return '<span class="mut">—</span>'; const d = Math.round(((a - b) / b) * 100); return `<span class="mut">${d > 0 ? '+' : ''}${d} %</span>`; };

export function viewBook() {
  const ym = ui.month, mm = sortedMovs(monthMovs(ym), 'asc'), tot = totals(mm);
  const start = totalBalance(ym + '-01'), end = start + tot.net;
  const prev = totals(monthMovs(addMonths(ym, -1)));
  const closed = isClosed(ym);

  let run = start;
  const rows = mm.map(m => {
    if (m.type === 'income') run += m.amount; else if (m.type === 'expense') run -= m.amount;
    const c = catOrDefault(m);
    const accName = esc(acc(m.accountId)?.name || '') + (m.type === 'transfer' ? ' a ' + esc(acc(m.toAccountId)?.name || '') : '');
    return `<tr class="click" data-act="edit" data-id="${m.id}"><td>${dShort(m.date)}</td><td class="wrap">${esc(m.description || c.name)}</td><td>${esc(c.icon)} ${esc(c.name)}</td><td>${accName}</td><td class="r amt ${amountClass(m.type)}">${signed(m.amount, m.type)}</td><td class="r amt">${money(run)}</td></tr>`;
  }).join('');

  const expCats = sumByCat(mm, 'expense'), incCats = sumByCat(mm, 'income');
  const days = {};
  for (const m of mm) { if (m.type === 'transfer') continue; days[m.date] ||= { inc: 0, exp: 0 }; days[m.date][m.type === 'income' ? 'inc' : 'exp'] += m.amount; }

  const catRows = expCats.map(x => {
    const lim = S.budgets.cats[x.id];
    const p = lim > 0 ? `<span class="pill ${x.total > lim ? 'bad' : pct(x.total, lim) >= S.settings.alertPct ? 'warn' : 'ok'}">${pct(x.total, lim)} %</span>` : `${pct(x.total, tot.exp)} %`;
    return `<tr><td>${esc(x.c.icon)} ${esc(x.c.name)}</td><td class="r amt neg">${money(x.total)}</td><td class="r amt">${lim > 0 ? money(lim) : '<span class="mut">—</span>'}</td><td class="r">${p}</td></tr>`;
  }).join('') + incCats.map(x => `<tr><td>${esc(x.c.icon)} ${esc(x.c.name)}</td><td class="r amt pos">${money(x.total)}</td><td class="r mut">—</td><td class="r">${pct(x.total, tot.inc)} %</td></tr>`).join('');

  return `
  <div class="ph"><div><h1>Libro mensual</h1><p>Todos los apuntes del mes, en orden y con saldo acumulado.</p></div>
    <div class="mnav"><button class="icon-btn" data-act="month" data-d="-1" aria-label="Mes anterior">‹</button><span class="m">${ymLabel(ym)}</span><button class="icon-btn" data-act="month" data-d="1" aria-label="Mes siguiente">›</button>${ym !== ymNow() ? '<button class="btn sm" data-act="monthToday">Mes actual</button>' : ''}</div></div>
  <div class="toolbar" style="margin-bottom:12px">${closed ? '<span class="pill ok">Mes cerrado</span>' : '<span class="pill">Mes abierto</span>'}
    <button class="btn sm" data-act="closeMonth">${closed ? 'Reabrir mes' : 'Cerrar mes'}</button>
    <button class="btn sm" data-act="exportMonth">Exportar mes a CSV</button></div>
  <div class="grid g3">
    <div class="card kpi"><div class="k-l">Saldo inicial</div><div class="k-v">${money(start)}</div></div>
    <div class="card kpi"><div class="k-l">Ingresos</div><div class="k-v pos">${money(tot.inc)}</div><div class="k-s">Mes anterior ${money(prev.inc)}, ${diff(tot.inc, prev.inc)}</div></div>
    <div class="card kpi"><div class="k-l">Gastos</div><div class="k-v neg">${money(tot.exp)}</div><div class="k-s">Mes anterior ${money(prev.exp)}, ${diff(tot.exp, prev.exp)}</div></div>
    <div class="card kpi"><div class="k-l">Balance neto</div><div class="k-v ${tot.net >= 0 ? 'pos' : 'neg'}">${signedNet(tot.net)}</div><div class="k-s">Ingresos menos gastos</div></div>
    <div class="card kpi"><div class="k-l">Saldo final acumulado</div><div class="k-v">${money(end)}</div><div class="k-s">Saldo inicial más balance</div></div>
  </div>
  <h2 class="sec">Apuntes</h2>
  ${mm.length ? `<div class="tbl"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Cuenta</th><th class="r">Importe</th><th class="r">Saldo</th></tr></thead>
    <tbody><tr><td colspan="5" class="mut">Saldo inicial</td><td class="r amt">${money(start)}</td></tr>${rows}</tbody>
    <tfoot><tr><td colspan="4">Total del mes</td><td class="r amt ${tot.net >= 0 ? 'pos' : 'neg'}">${signedNet(tot.net)}</td><td class="r amt">${money(end)}</td></tr></tfoot></table></div>`
    : `<div class="list">${emptyState('Este mes no tiene apuntes', `Los movimientos que registres con fecha de ${ymLabel(ym)} aparecerán aquí.`)}</div>`}
  ${mm.length ? `<div class="split" style="margin-top:4px">
    <div><h2 class="sec">Totales por categoría</h2><div class="tbl"><table><thead><tr><th>Categoría</th><th class="r">Total</th><th class="r">Presupuesto</th><th class="r">%</th></tr></thead><tbody>${catRows}</tbody></table></div></div>
    <div><h2 class="sec">Totales por día</h2><div class="tbl"><table><thead><tr><th>Día</th><th class="r">Ingresos</th><th class="r">Gastos</th><th class="r">Neto</th></tr></thead><tbody>
      ${Object.entries(days).sort().map(([d, v]) => `<tr><td>${dShort(d)}</td><td class="r amt pos">${v.inc ? money(v.inc) : ''}</td><td class="r amt neg">${v.exp ? money(v.exp) : ''}</td><td class="r amt">${signedNet(v.inc - v.exp)}</td></tr>`).join('')}
    </tbody></table></div></div></div>` : ''}`;
}

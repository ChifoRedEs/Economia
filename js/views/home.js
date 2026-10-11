// Pantalla de inicio: saldo, resumen del mes, avisos y últimos movimientos.
import { esc, today, pad, addMonths, daysIn, weekStart, ymNow, ymLabel, dShort, MONTHS, pct } from '../core/utils.js';
import { S, cat } from '../core/store.js';
import { money, signed, signedNet } from '../core/format.js';
import { totals, monthMovs, rangeMovs, totalBalance, accBalance, sumByCat, budgetStatus, dueRecurring, sortedMovs, dayNet } from '../core/calc.js';
import { guilloche, sparkline, movRow, emptyState, budRow } from '../ui/components.js';

export function viewHome() {
  const ym = ymNow(), t = today(), mm = monthMovs(ym), tot = totals(mm), bal = totalBalance();
  const dayN = Number(t.slice(8));

  let run = totalBalance(ym + '-01');
  const daily = [run];
  for (let d = 1; d <= dayN; d++) { run += dayNet(`${ym}-${pad(d)}`); daily.push(run); }

  const prevYm = addMonths(ym, -1), prevName = MONTHS[Number(prevYm.slice(5)) - 1];
  const prevTot = totals(rangeMovs(prevYm + '-01', `${prevYm}-${pad(Math.min(dayN, daysIn(prevYm)))}`));
  const curTot = totals(mm.filter(m => m.date <= t));
  const todayExp = totals(mm.filter(m => m.date === t)).exp;
  const weekExp = totals(rangeMovs(weekStart(t), t)).exp;
  const top = sumByCat(mm, 'expense')[0];
  const pend = dueRecurring().filter(d => !d.r.auto);
  const buds = budgetStatus(ym);
  const alerts = buds.filter(b => b.pct >= S.settings.alertPct);
  const last = sortedMovs().slice(0, 6);

  let cmp = 'Sin datos del mes anterior para comparar.';
  if (prevTot.exp > 0) {
    const d = Math.round(((curTot.exp - prevTot.exp) / prevTot.exp) * 100);
    cmp = d === 0 ? `Gastas lo mismo que a estas alturas de ${prevName}.` : `${Math.abs(d)} % ${d < 0 ? 'menos' : 'más'} que a estas alturas de ${prevName}.`;
  }

  const pendHTML = pend.length ? `<h2 class="sec">Pendientes de confirmar</h2><div class="list">${pend.map(d => {
    const c = cat(d.r.categoryId) || { icon: '↻', color: '#6C7A89' };
    return `<div class="pend"><span class="ic" style="--c:${esc(c.color)}">${esc(c.icon)}</span>
      <div class="t"><b>${esc(d.r.description || c.name)}</b><br><small class="mut">${dShort(d.date)}, ${signed(d.r.amount, d.r.type)}</small></div>
      <button class="btn sm" data-act="recSkip" data-id="${d.r.id}" data-ym="${d.ym}">Omitir</button>
      <button class="btn sm primary" data-act="recConfirm" data-id="${d.r.id}" data-date="${d.date}">Registrar</button></div>`;
  }).join('')}</div>` : '';

  const alertsHTML = alerts.length ? `<h2 class="sec">Avisos de presupuesto</h2>${alerts.map(b => `
    <div class="alert ${b.pct >= 100 ? 'bad' : ''}"><span class="ai">${b.pct >= 100 ? '⛔' : '⚠️'}</span>
    <div><b>${esc(b.label)}: ${b.pct} % usado</b><br><small>${money(b.spent)} de ${money(b.limit)}. ${b.pct >= 100 ? `Te has pasado ${money(b.spent - b.limit)}.` : `Quedan ${money(b.limit - b.spent)}.`}</small></div></div>`).join('')}` : '';

  return `
  <div class="ph"><div><h1>Hola</h1><p>Resumen de ${ymLabel(ym)}</p></div></div>
  <section class="note" aria-label="Saldo disponible">
    ${guilloche()}<span class="seal"></span>
    <div class="lbl">Saldo disponible</div>
    <div class="big">${money(bal)}</div>
    <div class="sub">Suma de tus ${S.accounts.length} cuentas</div>
    ${sparkline(daily)}
    <div class="stats">
      <div><span>Ingresos</span><b>${money(tot.inc)}</b></div>
      <div><span>Gastos</span><b>${money(tot.exp)}</b></div>
      <div><span>Balance</span><b>${signedNet(tot.net)}</b></div>
    </div>
  </section>
  <div class="accs">${S.accounts.map(a => `<div class="acc" style="--c:${esc(a.color)}"><div class="n"><i></i>${esc(a.name)}</div><div class="v">${money(accBalance(a.id))}</div></div>`).join('')}</div>
  ${pendHTML}${alertsHTML}
  <h2 class="sec">Este mes</h2>
  <div class="grid g4">
    <div class="card kpi"><div class="k-l">Gastado hoy</div><div class="k-v neg">${money(todayExp)}</div></div>
    <div class="card kpi"><div class="k-l">Gastado esta semana</div><div class="k-v neg">${money(weekExp)}</div></div>
    <div class="card kpi"><div class="k-l">Mayor categoría</div><div class="k-v" style="font-size:17px">${top ? `${esc(top.c.icon)} ${esc(top.c.name)}` : '—'}</div><div class="k-s">${top ? `${money(top.total)}, ${pct(top.total, tot.exp)} % del gasto` : 'Aún sin gastos'}</div></div>
    <div class="card kpi"><div class="k-l">Frente al mes anterior</div><div class="k-v ${prevTot.exp && curTot.exp > prevTot.exp ? 'neg' : 'pos'}" style="font-size:17px">${money(curTot.exp)}</div><div class="k-s">${cmp}</div></div>
  </div>
  <div class="split" style="margin-top:4px">
    <div><h2 class="sec">Últimos movimientos <button class="btn link" data-act="nav" data-view="movs">Ver todos</button></h2>
      <div class="list">${last.length ? last.map(m => movRow(m, { showDate: true })).join('') : emptyState('Todavía no hay movimientos', 'Registra tu primer gasto o ingreso con el botón +.')}</div></div>
    <div><h2 class="sec">Presupuestos <button class="btn link" data-act="nav" data-view="settings" data-anchor="budgets">Configurar</button></h2>
      <div class="card">${buds.length ? buds.map(budRow).join('') : '<p class="mut" style="margin:0">No tienes presupuestos. Define un límite mensual global o por categoría en Ajustes.</p>'}</div></div>
  </div>`;
}

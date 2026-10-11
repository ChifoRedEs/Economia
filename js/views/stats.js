// Estadísticas: indicadores, gráficas (Chart.js en carga diferida) y comparativas.
import { $$, esc, today, ymNow, ymOf, addMonths, daysIn, pad, daysBetween, monthsBetween, ymShort, dShort, dLong, nextDay, pct } from '../core/utils.js';
import { S, cat } from '../core/store.js';
import { money, compact } from '../core/format.js';
import { totals, rangeMovs, monthMovs, sumByCat, totalBalance, dayNet } from '../core/calc.js';
import { ui } from '../ui/state.js';
import { cssVar } from '../ui/dom.js';
import { emptyState, options } from '../ui/components.js';
import { loadChart } from '../lib/chart-loader.js';

const RANGES = [['month', 'Este mes'], ['quarter', 'Trimestre'], ['year', 'Este año'], ['12m', '12 meses'], ['custom', 'Personalizado']];

export function statsRange() {
  const r = ui.stats, t = today(), ym = ymNow();
  let a, b;
  if (r.range === 'month') { a = ym + '-01'; b = `${ym}-${pad(daysIn(ym))}`; }
  else if (r.range === 'quarter') {
    const [y, m] = ym.split('-').map(Number), q = Math.floor((m - 1) / 3) * 3 + 1, e = `${y}-${pad(q + 2)}`;
    a = `${y}-${pad(q)}-01`; b = `${e}-${pad(daysIn(e))}`;
  } else if (r.range === 'year') { a = t.slice(0, 4) + '-01-01'; b = t.slice(0, 4) + '-12-31'; }
  else if (r.range === '12m') { a = addMonths(ym, -11) + '-01'; b = `${ym}-${pad(daysIn(ym))}`; }
  else { a = r.from || ym + '-01'; b = r.to || t; if (a > b) [a, b] = [b, a]; }
  return [a, b];
}

export function viewStats() {
  const [a, b] = statsRange(), list = rangeMovs(a, b), tot = totals(list), t = today();
  const effEnd = b < t ? b : t;
  const days = Math.max(1, a <= effEnd ? daysBetween(a, effEnd) + 1 : 1);
  const saving = tot.inc ? Math.round(((tot.inc - tot.exp) / tot.inc) * 100) : null;
  const dayExp = {};
  for (const m of list) if (m.type === 'expense') dayExp[m.date] = (dayExp[m.date] || 0) + m.amount;
  const topDays = Object.entries(dayExp).sort((x, y) => y[1] - x[1]).slice(0, 5);
  const cats = sumByCat(list, 'expense');

  const endYm = ymOf(b) > ymNow() ? ymNow() : ymOf(b);
  const months6 = Array.from({ length: 6 }, (_, i) => addMonths(endYm, i - 5));
  const grid = new Map();
  for (const ym of months6) for (const m of monthMovs(ym)) if (m.type === 'expense') {
    const k = m.categoryId || '_none';
    if (!grid.has(k)) grid.set(k, {});
    grid.get(k)[ym] = (grid.get(k)[ym] || 0) + m.amount;
  }

  const head = `<div class="ph"><div><h1>Estadísticas</h1><p>Calculadas solo con tus movimientos reales.</p></div></div>
  <div class="seg" role="group" aria-label="Periodo">${RANGES.map(([v, l]) => `<button data-act="statsRange" data-v="${v}" aria-pressed="${ui.stats.range === v}">${l}</button>`).join('')}</div>
  ${ui.stats.range === 'custom' ? `<div class="row2" style="max-width:420px"><label class="field"><span class="lbl">Desde</span><input type="date" data-stats="from" value="${a}"></label><label class="field"><span class="lbl">Hasta</span><input type="date" data-stats="to" value="${b}"></label></div>` : ''}
  <p class="mut" style="margin:10px 2px 14px">Del ${dLong(a)} al ${dLong(b)}</p>`;
  if (!list.length) return head + `<div class="list">${emptyState('No hay datos en este periodo', 'Cuando registres movimientos, aquí verás tus gráficas.')}</div>`;

  return head + `
  <div class="grid g4">
    <div class="card kpi"><div class="k-l">Ingresos</div><div class="k-v pos">${money(tot.inc)}</div></div>
    <div class="card kpi"><div class="k-l">Gastos</div><div class="k-v neg">${money(tot.exp)}</div></div>
    <div class="card kpi"><div class="k-l">Tasa de ahorro</div><div class="k-v">${saving === null ? '—' : saving + ' %'}</div><div class="k-s">${saving === null ? 'Sin ingresos en el periodo' : 'De tus ingresos que no gastas'}</div></div>
    <div class="card kpi"><div class="k-l">Gasto medio diario</div><div class="k-v">${money(Math.round(tot.exp / days))}</div><div class="k-s">Sobre ${days} ${days === 1 ? 'día' : 'días'}</div></div>
  </div>
  <h2 class="sec">Gastos por categoría</h2>
  <div class="card">${cats.length ? `<div class="donut-wrap"><div class="chart-box"><canvas id="chCat" role="img" aria-label="Gráfica de gastos por categoría"></canvas></div>
    <div class="legend">${cats.slice(0, 10).map(x => `<div style="--c:${esc(x.c.color)}"><i></i><span>${esc(x.c.icon)} ${esc(x.c.name)}</span><span class="mut">${pct(x.total, tot.exp)} %</span><b>${money(x.total)}</b></div>`).join('')}</div></div>` : '<p class="mut" style="margin:0">Sin gastos en este periodo.</p>'}</div>
  <div class="split">
    <div><h2 class="sec">Ingresos frente a gastos</h2><div class="card"><div class="chart-box"><canvas id="chBars" role="img" aria-label="Ingresos y gastos por mes"></canvas></div></div></div>
    <div><h2 class="sec">Evolución del saldo</h2><div class="card"><div class="chart-box"><canvas id="chLine" role="img" aria-label="Evolución del saldo acumulado"></canvas></div></div></div>
  </div>
  <div class="split">
    <div><h2 class="sec">Comparación por categoría y mes</h2>
      ${grid.size ? `<div class="tbl"><table><thead><tr><th>Categoría</th>${months6.map(m => `<th class="r">${ymShort(m)}</th>`).join('')}</tr></thead><tbody>
      ${[...grid.entries()].map(([cid, row]) => { const c = cat(cid) || { icon: '❔', name: 'Sin categoría' }; return `<tr><td>${esc(c.icon)} ${esc(c.name)}</td>${months6.map(m => `<td class="r amt">${row[m] ? money(row[m]) : '<span class="mut">—</span>'}</td>`).join('')}</tr>`; }).join('')}
      </tbody><tfoot><tr><td>Total</td>${months6.map(m => `<td class="r amt">${money(totals(monthMovs(m)).exp)}</td>`).join('')}</tr></tfoot></table></div>` : '<div class="card mut">Sin gastos en los últimos seis meses.</div>'}</div>
    <div><h2 class="sec">Días con mayor gasto</h2><div class="list">${topDays.length ? topDays.map(([d, v], i) => `<div class="mv" style="cursor:default"><span class="ic" style="--c:var(--exp)">${i + 1}</span><span class="t"><b style="text-transform:capitalize">${new Date(d + 'T00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</b></span><span class="amt neg">${money(v)}</span></div>`).join('') : emptyState('Sin gastos', '', false)}</div></div>
  </div>`;
}

/* ---------- Gráficas ---------- */
const charts = {};
export function destroyCharts() { for (const k in charts) { charts[k].destroy(); delete charts[k]; } }

export async function drawStats() {
  destroyCharts();
  const [a, b] = statsRange(), list = rangeMovs(a, b);
  if (!list.length) return;
  let Chart;
  try { Chart = await loadChart(); }
  catch (e) { $$('.chart-box').forEach(el => (el.innerHTML = '<p class="chart-note">No se han podido cargar las gráficas. Comprueba la conexión y vuelve a abrir Estadísticas.</p>')); return; }
  if (ui.view !== 'stats' || !document.getElementById('chBars')) return;
  destroyCharts();

  const muted = cssVar('--muted'), line = cssVar('--line'), inc = cssVar('--inc'), exp = cssVar('--exp'), brand = cssVar('--brand');
  Chart.defaults.font.family = 'Manrope, system-ui, sans-serif';
  Chart.defaults.color = muted;
  const tip = { callbacks: { label: c => `${c.dataset.label ? c.dataset.label + ': ' : ''}${money(Math.round(c.raw * 100))}` } };
  const mk = (id, cfg) => { const el = document.getElementById(id); if (el) charts[id] = new Chart(el, cfg); };

  const cats = sumByCat(list, 'expense');
  if (cats.length) mk('chCat', {
    type: 'doughnut',
    data: { labels: cats.map(x => x.c.name), datasets: [{ data: cats.map(x => x.total / 100), backgroundColor: cats.map(x => x.c.color), borderColor: cssVar('--surface'), borderWidth: 3 }] },
    options: { cutout: '66%', maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.label}: ${money(Math.round(c.raw * 100))}` } } } }
  });

  const months = monthsBetween(a, b);
  const perMonth = months.map(m => totals(monthMovs(m).filter(x => x.date >= a && x.date <= b)));
  const yScale = { grid: { color: line }, border: { display: false }, ticks: { callback: v => compact(v) } };
  mk('chBars', {
    type: 'bar',
    data: { labels: months.map(ymShort), datasets: [
      { label: 'Ingresos', data: perMonth.map(t => t.inc / 100), backgroundColor: inc, borderRadius: 6, maxBarThickness: 26 },
      { label: 'Gastos', data: perMonth.map(t => t.exp / 100), backgroundColor: exp, borderRadius: 6, maxBarThickness: 26 }] },
    options: { maintainAspectRatio: false, scales: { x: { grid: { display: false } }, y: yScale }, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: tip } }
  });

  const t = today(), end = b < t ? b : t, labels = [], vals = [];
  if (a <= end) {
    if (daysBetween(a, b) <= 62) {
      let run = totalBalance(a);
      for (let d = a; d <= end; d = nextDay(d)) { run += dayNet(d); labels.push(dShort(d)); vals.push(run / 100); }
    } else {
      for (const m of months) {
        if (m + '-01' > end) break;
        labels.push(ymShort(m));
        vals.push(totalBalance(m === ymOf(end) ? nextDay(end) : addMonths(m, 1) + '-01') / 100);
      }
    }
  }
  mk('chLine', {
    type: 'line',
    data: { labels, datasets: [{ label: 'Saldo', data: vals, borderColor: brand, backgroundColor: brand + '22', fill: true, tension: 0.3, pointRadius: vals.length > 40 ? 0 : 3, pointBackgroundColor: brand, borderWidth: 2.2 }] },
    options: { maintainAspectRatio: false, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }, y: yScale }, plugins: { legend: { display: false }, tooltip: tip } }
  });
}

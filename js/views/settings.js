// Ajustes: instalación, apariencia, presupuestos, cuentas, categorías, recurrentes y datos.
import { esc, centsToInput } from '../core/utils.js';
import { S, cat, catsOf } from '../core/store.js';
import { ACC_TYPES, ACC_ICONS, CURRENCIES } from '../core/constants.js';
import { money, signed } from '../core/format.js';
import { accBalance } from '../core/calc.js';
import { ui } from '../ui/state.js';
import { options } from '../ui/components.js';
import { installHTML } from '../features/pwa.js';

const sec = (id, title, body) => `<h2 class="sec" id="${id}">${title}</h2><div class="card set-sec">${body}</div>`;
const editBtn = (act, id, name) => `<button class="icon-btn" data-act="${act}" data-id="${id}" aria-label="Editar ${esc(name)}">✎</button>`;

export function viewSettings() {
  const s = S.settings;
  const movCount = new Map();
  for (const m of S.movements) if (m.categoryId) movCount.set(m.categoryId, (movCount.get(m.categoryId) || 0) + 1);

  return `
  <div class="ph"><div><h1>Ajustes</h1><p>Personaliza la app y protege tus datos.</p></div></div>
  ${sec('install', 'Instalar en el móvil', installHTML())}
  ${sec('look', 'Apariencia', `
    <div class="set-row"><div class="t"><b>Tema</b></div><div class="seg" style="width:auto">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([v, l]) => `<button data-act="theme" data-v="${v}" aria-pressed="${s.theme === v}">${l}</button>`).join('')}</div></div>
    <div class="set-row"><div class="t"><b>Moneda</b><small>Cambia solo el formato, no convierte importes.</small></div><select data-setting="currency" style="width:auto;max-width:220px">${options(Object.entries(CURRENCIES), s.currency)}</select></div>`)}
  ${sec('budgets', 'Presupuestos mensuales', `
    <div class="set-row"><div class="t"><b>Límite global</b><small>Para todos los gastos del mes. Déjalo vacío si no quieres límite.</small></div><input class="bud-in" inputmode="decimal" data-bud="global" value="${S.budgets.global ? centsToInput(S.budgets.global) : ''}" placeholder="Sin límite"></div>
    <div class="set-row"><div class="t"><b>Avisar al alcanzar</b><small>Porcentaje del presupuesto a partir del cual verás un aviso.</small></div><select data-setting="alertPct" style="width:auto">${options([50, 70, 75, 80, 90, 100].map(p => [p, p + ' %']), s.alertPct)}</select></div>
    ${catsOf('expense').map(c => `<div class="set-row"><span class="ic" style="--c:${esc(c.color)}">${esc(c.icon)}</span><div class="t"><b>${esc(c.name)}</b></div><input class="bud-in" inputmode="decimal" data-bud="${c.id}" value="${S.budgets.cats[c.id] ? centsToInput(S.budgets.cats[c.id]) : ''}" placeholder="Sin límite" aria-label="Presupuesto de ${esc(c.name)}"></div>`).join('')}
    <div style="margin-top:12px"><button class="btn primary" data-act="saveBudgets">Guardar presupuestos</button></div>`)}
  ${sec('accounts', 'Cuentas', `
    ${S.accounts.map(a => `<div class="set-row"><span class="ic" style="--c:${esc(a.color)}">${ACC_ICONS[a.type] || '🏦'}</span>
      <div class="t"><b>${esc(a.name)}</b><small>${ACC_TYPES[a.type] || ''}</small><span class="amt" style="font-size:14px">${money(accBalance(a.id))}</span></div>
      <button class="btn sm" data-act="accRec" data-id="${a.id}">Conciliar</button>${editBtn('accEdit', a.id, a.name)}</div>`).join('')}
    <div style="margin-top:12px"><button class="btn" data-act="accEdit">Añadir cuenta</button></div>`)}
  ${sec('cats', 'Categorías', `
    <div class="seg" style="max-width:320px;margin-bottom:10px">${[['expense', 'Gastos'], ['income', 'Ingresos']].map(([v, l]) => `<button data-act="catTab" data-v="${v}" aria-pressed="${ui.catTab === v}">${l}</button>`).join('')}</div>
    ${catsOf(ui.catTab).map(c => `<div class="set-row"><span class="ic" style="--c:${esc(c.color)}">${esc(c.icon)}</span><div class="t"><b>${esc(c.name)}</b><small>${movCount.get(c.id) || 0} movimientos</small></div>${editBtn('catEdit', c.id, c.name)}</div>`).join('')}
    <div style="margin-top:12px"><button class="btn" data-act="catEdit">Añadir categoría</button></div>`)}
  ${sec('rec', 'Gastos e ingresos recurrentes', `
    ${S.recurring.length ? S.recurring.map(r => {
      const c = cat(r.categoryId) || { icon: '↻', color: '#6C7A89', name: '' };
      return `<div class="set-row"><span class="ic" style="--c:${esc(c.color)}">${esc(c.icon)}</span><div class="t"><b>${esc(r.description || c.name)}</b><small>Día ${r.day} de cada mes, ${r.auto ? 'se registra solo' : 'pide confirmación'}${r.active ? '' : ', en pausa'}</small></div><span class="amt ${r.type === 'income' ? 'pos' : 'neg'}">${signed(r.amount, r.type)}</span>${editBtn('recEdit', r.id, r.description || c.name)}</div>`;
    }).join('') : '<p class="mut" style="margin:0 0 4px">Alquiler, nómina, suscripciones, seguros… Regístralos una vez y la app los apuntará cada mes.</p>'}
    <div style="margin-top:12px"><button class="btn" data-act="recEdit">Añadir recurrente</button></div>`)}
  ${sec('data', 'Copias de seguridad y exportación', `
    <div class="set-row"><div class="t"><b>Copia de seguridad completa</b><small>Guarda movimientos, cuentas, categorías, presupuestos y recurrentes en un archivo JSON.</small></div><button class="btn primary sm" data-act="exportJSON">Exportar JSON</button></div>
    <div class="set-row"><div class="t"><b>Restaurar o importar</b><small>Acepta copias de esta app y también listas de movimientos en JSON de otras apps (fecha, importe, tipo, categoría).</small></div><button class="btn sm" data-act="importJSON">Importar JSON</button></div>
    <div class="set-row"><div class="t"><b>Todos los movimientos a CSV</b><small>Compatible con Excel (separador punto y coma).</small></div><button class="btn sm" data-act="exportCSV">Exportar CSV</button></div>
    <div class="set-row"><div class="t"><b>Borrar todos los datos</b><small>Elimina todo lo guardado en este navegador. Exporta una copia antes.</small></div><button class="btn sm danger" data-act="wipe">Borrar datos</button></div>`)}
  <p class="mut" style="font-size:13px;margin:16px 4px">Tus datos se guardan solo en este navegador y en este dispositivo. No se sincronizan entre el móvil y el ordenador: usa la copia de seguridad para pasarlos de uno a otro.</p>`;
}

// Copias de seguridad, importación y exportación (JSON y CSV).
import { esc, uid, pad, isoD, today, parseAmount } from '../core/utils.js';
import { S, save, cat, acc, catsOf, normalize, replaceState } from '../core/store.js';
import { METHODS, TYPE_L } from '../core/constants.js';
import { setCurrency } from '../core/format.js';
import { sortedMovs, processRecurring } from '../core/calc.js';
import { toast, confirmDlg, applyTheme } from '../ui/dom.js';
import { render } from '../ui/render.js';

/** Descarga un archivo. Dentro del visor de Claude usa su capacidad de descargas; en el navegador, un enlace. */
export async function download(filename, data, mime) {
  try {
    if (window.claude && typeof window.claude.use === 'function') {
      const dl = await window.claude.use('downloads');
      if (dl) {
        try { await dl.save({ filename, data }); toast('Archivo listo: ' + filename); }
        catch (e) { if (e?.code !== 'declined') toast('No se ha podido guardar el archivo.', 'err'); }
        return;
      }
    }
  } catch (e) { /* sin visor: seguimos con la descarga normal */ }
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast('Descargado: ' + filename);
}

const csvCell = v => { const s = String(v ?? ''); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export function toCSV(list) {
  const head = ['Fecha', 'Tipo', 'Categoría', 'Cuenta', 'Cuenta destino', 'Método', 'Descripción', 'Importe', 'Revisado'];
  const rows = sortedMovs(list, 'asc').map(m => [
    m.date, TYPE_L[m.type], cat(m.categoryId)?.name || '', acc(m.accountId)?.name || '', acc(m.toAccountId)?.name || '',
    METHODS[m.method] || '', m.description || '', (m.type === 'expense' ? '-' : '') + (m.amount / 100).toFixed(2).replace('.', ','), m.reviewed ? 'Sí' : 'No'
  ]);
  return '\ufeff' + [head, ...rows].map(r => r.map(csvCell).join(';')).join('\r\n');
}

export const exportBackup = () => download(`finanzas_copia_${today()}.json`, JSON.stringify({ ...S, app: 'agenda-finanzas', exportedAt: new Date().toISOString() }, null, 2), 'application/json');
export function exportCSV(list, filename) {
  if (!list.length) return toast('No hay movimientos que exportar.');
  download(filename, toCSV(list), 'text/csv;charset=utf-8');
}

/* ---------- Importación ---------- */
function validateBackup(d) {
  const errs = [];
  if (!Array.isArray(d.movements)) return ['El archivo no contiene una lista de movimientos.'];
  d.movements.forEach((m, i) => {
    if (errs.length > 4) return;
    if (!['income', 'expense', 'transfer'].includes(m?.type)) errs.push(`Movimiento ${i + 1}: el tipo no es válido.`);
    else if (!Number.isInteger(m.amount) || m.amount <= 0) errs.push(`Movimiento ${i + 1}: el importe no es válido.`);
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(m.date || '')) errs.push(`Movimiento ${i + 1}: la fecha no es válida.`);
  });
  if (d.accounts !== undefined && !Array.isArray(d.accounts)) errs.push('Las cuentas no tienen un formato válido.');
  if (d.categories !== undefined && !Array.isArray(d.categories)) errs.push('Las categorías no tienen un formato válido.');
  return errs;
}
function normDate(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  const n = Number(s);
  return n > 1e11 ? isoD(new Date(n)) : null;
}
/** Convierte listas de otras apps (o de la versión anterior) a movimientos de esta app. */
function mapLegacy(src) {
  const arrs = [];
  if (Array.isArray(src)) arrs.push([src, null]);
  else if (src && typeof src === 'object') {
    if (Array.isArray(src.gastos)) arrs.push([src.gastos, 'expense']);
    if (Array.isArray(src.ingresos)) arrs.push([src.ingresos, 'income']);
    for (const k of ['movimientos', 'transacciones', 'transactions', 'registros', 'items', 'data', 'entries', 'records']) if (Array.isArray(src[k])) arrs.push([src[k], null]);
  }
  const out = [], newCats = [];
  for (const [arr, forced] of arrs) for (const o of arr) {
    if (!o || typeof o !== 'object') continue;
    const raw = o.amount ?? o.importe ?? o.monto ?? o.cantidad ?? o.valor ?? o.value;
    let cents = typeof raw === 'number' ? Math.round(raw * 100) : parseAmount(raw);
    if (isNaN(cents) || cents === 0) continue;
    const date = normDate(o.date ?? o.fecha ?? o.dia ?? o.day); if (!date) continue;
    const tr = String(o.type ?? o.tipo ?? '').toLowerCase();
    const type = forced || (/ingres|income|entrada|cobro/.test(tr) ? 'income' : 'expense');
    cents = Math.abs(cents);
    const cname = String(o.category ?? o.categoria ?? o['categoría'] ?? o.cat ?? '').trim();
    let c = cname ? S.categories.concat(newCats).find(x => x.type === type && x.name.toLowerCase() === cname.toLowerCase()) : null;
    if (cname && !c) { c = { id: uid('cat_'), name: cname.slice(0, 30), icon: '🏷️', type, color: '#6C7A89' }; newCats.push(c); }
    if (!c) c = catsOf(type).find(x => /otros/i.test(x.name)) || catsOf(type)[0];
    out.push({
      id: uid('m_'), type, amount: cents, date, categoryId: c?.id || null, accountId: S.accounts[0].id, method: 'otro',
      description: String(o.description ?? o.descripcion ?? o['descripción'] ?? o.concepto ?? o.nota ?? o.note ?? '').slice(0, 140), reviewed: false, created: Date.now()
    });
  }
  return { movs: out, newCats };
}

export async function importFile(file) {
  let d;
  try { d = JSON.parse(await file.text()); } catch (e) { return toast('El archivo no es un JSON válido.', 'err'); }
  const isBackup = d && typeof d === 'object' && !Array.isArray(d) && Array.isArray(d.movements) && (d.app === 'agenda-finanzas' || Array.isArray(d.accounts));

  if (isBackup) {
    const errs = validateBackup(d);
    if (errs.length) return confirmDlg('No se puede restaurar esta copia', 'Entendido', false, errs.map(esc).join('<br>'));
    if (!(await confirmDlg('¿Restaurar esta copia de seguridad?', 'Restaurar', true, `Contiene ${d.movements.length} movimientos. Sustituirá todos los datos actuales de este navegador.`))) return;
    replaceState(normalize(d));
    setCurrency(S.settings.currency); applyTheme(); processRecurring(); render();
    return toast('Copia restaurada');
  }

  const { movs, newCats } = mapLegacy(d);
  if (!movs.length) return confirmDlg('No se han encontrado movimientos', 'Entendido', false, 'El archivo no tiene el formato de una copia de esta app ni una lista reconocible con fecha e importe.');
  const sig = m => `${m.date}|${m.type}|${m.amount}|${(m.description || '').toLowerCase()}`;
  const have = new Set(S.movements.map(sig)), fresh = movs.filter(m => !have.has(sig(m)));
  if (!(await confirmDlg(`Se han encontrado ${movs.length} movimientos`, `Añadir ${fresh.length}`, false,
    `${movs.length - fresh.length} ya existían y se omitirán. Se añadirán a la cuenta ${esc(S.accounts[0].name)}${newCats.length ? ` y se crearán ${newCats.length} categorías nuevas` : ''}.`))) return;
  if (!fresh.length) return toast('No había movimientos nuevos que añadir');
  const usedCats = new Set(fresh.map(m => m.categoryId));
  S.categories.push(...newCats.filter(c => usedCats.has(c.id)));
  S.movements.push(...fresh);
  save(); render(); toast(`${fresh.length} movimientos importados`);
}

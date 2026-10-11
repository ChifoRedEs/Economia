// Hoja para crear, editar, duplicar y eliminar movimientos.
import { $, $$, esc, uid, today, ymOf, parseAmount, centsToInput } from '../core/utils.js';
import { S, save, acc, catsOf, isClosed } from '../core/store.js';
import { METHODS, TYPE_L } from '../core/constants.js';
import { money, curSymbol } from '../core/format.js';
import { openSheet, closeSheet, confirmDlg, toast } from '../ui/dom.js';
import { accOptions, options } from '../ui/components.js';
import { refresh } from '../ui/render.js';

const MAX_AMOUNT = 99999999999;

export function openMovSheet(m, preset) {
  const isNew = !m;
  const d = m ? { ...m } : {
    type: 'expense', amount: 0, date: today(), categoryId: null, accountId: S.accounts[0]?.id,
    toAccountId: S.accounts[1]?.id || S.accounts[0]?.id, method: 'tarjeta', description: '', reviewed: false, ...(preset || {})
  };
  const body = `
    <div class="seg" role="group" aria-label="Tipo de movimiento" id="fType">${['expense', 'income', 'transfer'].map(v => `<button type="button" data-type="${v}" aria-pressed="${d.type === v}">${TYPE_L[v]}</button>`).join('')}</div>
    <label class="amount-field t-${d.type}" id="fAmtWrap"><span class="sr">Importe</span><input id="fAmt" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${d.amount ? centsToInput(d.amount) : ''}" ${isNew ? 'autofocus' : ''}><span class="cur">${esc(curSymbol())}</span></label>
    <div class="field" id="fCatField"><span class="lbl">Categoría</span><div class="chips" id="fCats"></div></div>
    <div class="row2"><label class="field"><span class="lbl">Fecha</span><input type="date" id="fDate" value="${d.date}"></label>
      <label class="field"><span class="lbl" id="fAccLbl">Cuenta</span><select id="fAcc">${accOptions(d.accountId)}</select></label></div>
    <div class="row2"><label class="field" id="fToWrap"><span class="lbl">Cuenta destino</span><select id="fTo">${accOptions(d.toAccountId)}</select></label>
      <label class="field" id="fMethodWrap"><span class="lbl">Método de pago</span><select id="fMethod">${options(Object.entries(METHODS), d.method)}</select></label></div>
    <label class="field"><span class="lbl">Descripción</span><input id="fDesc" maxlength="140" value="${esc(d.description)}" placeholder="Por ejemplo, compra semanal"></label>
    <label class="check"><input type="checkbox" id="fRev" ${d.reviewed ? 'checked' : ''}> Marcar como revisado</label>
    <div class="err" id="fErr" role="alert"></div>`;
  const footer = isNew
    ? '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="fSave">Guardar movimiento</button>'
    : '<button class="btn danger" id="fDel">Eliminar</button><button class="btn" id="fDup">Duplicar</button><span class="spacer"></span><button class="btn primary" id="fSave">Guardar cambios</button>';

  openSheet({ title: isNew ? 'Nuevo movimiento' : 'Editar movimiento', body, footer, onMount(root) {
    let type = d.type, catId = d.categoryId;
    const paint = () => {
      $$('#fType button', root).forEach(b => b.setAttribute('aria-pressed', b.dataset.type === type));
      $('#fAmtWrap', root).className = 'amount-field t-' + type;
      const tr = type === 'transfer';
      $('#fCatField', root).style.display = tr ? 'none' : '';
      $('#fToWrap', root).style.display = tr ? '' : 'none';
      $('#fMethodWrap', root).style.display = tr ? 'none' : '';
      $('#fAccLbl', root).textContent = tr ? 'Cuenta origen' : 'Cuenta';
      if (!tr) {
        const list = catsOf(type);
        if (!list.some(c => c.id === catId)) catId = list[0]?.id || null;
        $('#fCats', root).innerHTML = list.map(c => `<button type="button" class="chip" style="--c:${esc(c.color)}" data-cat="${c.id}" aria-pressed="${c.id === catId}"><span class="e">${esc(c.icon)}</span>${esc(c.name)}</button>`).join('');
      }
    };
    paint();
    $('#fType', root).addEventListener('click', e => { const b = e.target.closest('[data-type]'); if (b) { type = b.dataset.type; paint(); } });
    $('#fCats', root).addEventListener('click', e => {
      const b = e.target.closest('[data-cat]'); if (!b) return;
      catId = b.dataset.cat;
      $$('#fCats .chip', root).forEach(x => x.setAttribute('aria-pressed', x.dataset.cat === catId));
    });
    const collect = () => ({
      type, amount: parseAmount($('#fAmt', root).value), date: $('#fDate', root).value,
      categoryId: type === 'transfer' ? null : catId, accountId: $('#fAcc', root).value,
      toAccountId: type === 'transfer' ? $('#fTo', root).value : null,
      method: type === 'transfer' ? 'transferencia' : $('#fMethod', root).value,
      description: $('#fDesc', root).value.trim(), reviewed: $('#fRev', root).checked
    });
    const err = t => { $('#fErr', root).textContent = t; };

    $('#fSave', root).addEventListener('click', async () => {
      const v = collect();
      if (isNaN(v.amount) || v.amount <= 0) return err('Escribe un importe mayor que cero, por ejemplo 12,50.');
      if (v.amount > MAX_AMOUNT) return err('El importe es demasiado grande.');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return err('Elige una fecha válida.');
      if (!acc(v.accountId)) return err('Elige una cuenta.');
      if (v.type === 'transfer' && (S.accounts.length < 2 || v.accountId === v.toAccountId)) return err('Para una transferencia elige dos cuentas distintas. Puedes crear cuentas en Ajustes.');
      const touched = [ymOf(v.date)]; if (m) touched.push(ymOf(m.date));
      if (touched.some(isClosed) && !(await confirmDlg('Este mes está cerrado', 'Guardar igualmente', false, 'Vas a modificar un mes que marcaste como cerrado. Sus totales cambiarán.'))) return;
      if (m) Object.assign(m, v, { updated: Date.now() });
      else S.movements.push({ id: uid('m_'), ...v, created: Date.now() });
      save(); closeSheet(); refresh(); toast(m ? 'Cambios guardados' : 'Movimiento guardado');
    });
    $('#fAmt', root).addEventListener('keydown', e => { if (e.key === 'Enter') $('#fSave', root).click(); });

    if (!isNew) {
      $('#fDel', root).addEventListener('click', async () => {
        if (!(await confirmDlg('¿Eliminar este movimiento?', 'Eliminar', true, `${esc(m.description || TYPE_L[m.type])}, ${money(m.amount)}. No se puede deshacer.`))) return;
        S.movements = S.movements.filter(x => x.id !== m.id);
        save(); closeSheet(); refresh(); toast('Movimiento eliminado');
      });
      $('#fDup', root).addEventListener('click', () => {
        const v = collect();
        closeSheet();
        openMovSheet(null, { ...v, amount: isNaN(v.amount) ? 0 : v.amount, date: today(), reviewed: false });
        toast('Copia lista: revisa y guarda');
      });
    }
  } });
}

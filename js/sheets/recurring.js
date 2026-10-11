// Hoja de movimientos recurrentes (alquiler, nómina, suscripciones…).
import { $, $$, uid, esc, ymNow, parseAmount, centsToInput } from '../core/utils.js';
import { S, save, catsOf } from '../core/store.js';
import { METHODS, TYPE_L } from '../core/constants.js';
import { processRecurring } from '../core/calc.js';
import { openSheet, closeSheet, confirmDlg, toast } from '../ui/dom.js';
import { accOptions, catOptions, options } from '../ui/components.js';
import { render } from '../ui/render.js';

export function openRecurringSheet(r) {
  const isNew = !r;
  const d = r || { type: 'expense', amount: 0, description: '', categoryId: catsOf('expense')[0]?.id, accountId: S.accounts[0]?.id, method: 'domiciliacion', day: 1, start: ymNow(), auto: false, active: true };
  openSheet({
    title: isNew ? 'Nuevo recurrente' : 'Editar recurrente',
    body: `
      <div class="seg" id="rType">${['expense', 'income'].map(v => `<button type="button" data-type="${v}" aria-pressed="${d.type === v}">${TYPE_L[v]}</button>`).join('')}</div>
      <div class="row2"><label class="field"><span class="lbl">Importe</span><input id="rAmt" inputmode="decimal" value="${d.amount ? centsToInput(d.amount) : ''}" placeholder="0,00" autofocus></label>
      <label class="field"><span class="lbl">Día del mes</span><input type="number" id="rDay" min="1" max="31" value="${d.day}"></label></div>
      <label class="field"><span class="lbl">Descripción</span><input id="rDesc" value="${esc(d.description)}" maxlength="80" placeholder="Por ejemplo, alquiler"></label>
      <div class="row2"><label class="field"><span class="lbl">Categoría</span><select id="rCat">${catOptions(d.type, d.categoryId)}</select></label>
      <label class="field"><span class="lbl">Cuenta</span><select id="rAcc">${accOptions(d.accountId)}</select></label></div>
      <div class="row2"><label class="field"><span class="lbl">Método</span><select id="rMethod">${options(Object.entries(METHODS), d.method)}</select></label>
      <label class="field"><span class="lbl">Desde el mes</span><input type="month" id="rStart" value="${d.start}"></label></div>
      <label class="check"><input type="checkbox" id="rAuto" ${d.auto ? 'checked' : ''}> Registrar automáticamente (si no, te pedirá confirmación en Inicio)</label>
      <label class="check"><input type="checkbox" id="rActive" ${d.active ? 'checked' : ''}> Activo</label>
      <div class="err" id="rErr"></div>`,
    footer: `${isNew ? '' : '<button class="btn danger" id="rDel">Eliminar</button><span class="spacer"></span>'}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="rSave">${isNew ? 'Añadir recurrente' : 'Guardar cambios'}</button>`,
    onMount(root) {
      let type = d.type;
      const err = t => { $('#rErr', root).textContent = t; };
      $('#rType', root).addEventListener('click', e => {
        const b = e.target.closest('[data-type]'); if (!b) return;
        type = b.dataset.type;
        $$('#rType button', root).forEach(x => x.setAttribute('aria-pressed', x.dataset.type === type));
        $('#rCat', root).innerHTML = catOptions(type);
      });
      $('#rSave', root).addEventListener('click', () => {
        const amount = parseAmount($('#rAmt', root).value), day = Math.round(Number($('#rDay', root).value));
        if (isNaN(amount) || amount <= 0) return err('Escribe un importe mayor que cero.');
        if (!(day >= 1 && day <= 31)) return err('El día debe estar entre 1 y 31.');
        const v = {
          type, amount, day, description: $('#rDesc', root).value.trim(), categoryId: $('#rCat', root).value,
          accountId: $('#rAcc', root).value, method: $('#rMethod', root).value, start: $('#rStart', root).value || ymNow(),
          auto: $('#rAuto', root).checked, active: $('#rActive', root).checked
        };
        if (r) Object.assign(r, v); else S.recurring.push({ id: uid('r_'), skipped: [], ...v });
        save();
        const n = processRecurring();
        closeSheet(); render(true);
        toast((r ? 'Recurrente actualizado' : 'Recurrente añadido') + (n ? `. Se han registrado ${n} movimientos pendientes.` : ''));
      });
      if (r) $('#rDel', root).addEventListener('click', async () => {
        if (!(await confirmDlg('¿Eliminar este recurrente?', 'Eliminar', true, 'Los movimientos ya registrados se conservan.'))) return;
        S.recurring = S.recurring.filter(x => x.id !== r.id);
        S.movements.forEach(m => { if (m.recurringId === r.id) delete m.recurringId; });
        save(); closeSheet(); render(true); toast('Recurrente eliminado');
      });
    }
  });
}

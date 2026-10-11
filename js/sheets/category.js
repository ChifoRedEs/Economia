// Hoja de categorías: alta, edición y eliminación con reasignación de movimientos.
import { $, uid, esc } from '../core/utils.js';
import { S, save, catsOf } from '../core/store.js';
import { openSheet, closeSheet, confirmDlg, toast } from '../ui/dom.js';
import { ui } from '../ui/state.js';
import { render } from '../ui/render.js';

export function openCatSheet(c) {
  const isNew = !c, d = c || { name: '', icon: '🏷️', type: ui.catTab, color: '#2F7DD1' };
  const used = c ? S.movements.filter(m => m.categoryId === c.id).length : 0;
  openSheet({
    title: isNew ? 'Nueva categoría' : 'Editar categoría',
    body: `
      <div class="row2" style="grid-template-columns:90px 1fr"><label class="field"><span class="lbl">Icono</span><input id="cIcon" value="${esc(d.icon)}" maxlength="4" style="text-align:center;font-size:20px"></label>
      <label class="field"><span class="lbl">Nombre</span><input id="cName" value="${esc(d.name)}" maxlength="30" autofocus></label></div>
      <div class="row2"><label class="field"><span class="lbl">Tipo</span><select id="cType" ${used ? 'disabled' : ''}><option value="expense" ${d.type === 'expense' ? 'selected' : ''}>Gasto</option><option value="income" ${d.type === 'income' ? 'selected' : ''}>Ingreso</option></select></label>
      <label class="field"><span class="lbl">Color</span><input type="color" id="cColor" value="${esc(d.color)}"></label></div>
      <div class="err" id="cErr"></div>`,
    footer: `${isNew ? '' : '<button class="btn danger" id="cDel">Eliminar</button><span class="spacer"></span>'}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="cSave">${isNew ? 'Añadir categoría' : 'Guardar cambios'}</button>`,
    onMount(root) {
      const err = t => { $('#cErr', root).textContent = t; };
      $('#cSave', root).addEventListener('click', () => {
        const name = $('#cName', root).value.trim(); if (!name) return err('Escribe un nombre.');
        const v = { name, icon: $('#cIcon', root).value.trim() || '🏷️', type: $('#cType', root).value, color: $('#cColor', root).value };
        if (c) Object.assign(c, v); else S.categories.push({ id: uid('cat_'), ...v });
        ui.catTab = v.type;
        save(); closeSheet(); render(true); toast(c ? 'Categoría actualizada' : 'Categoría añadida');
      });
      if (c) $('#cDel', root).addEventListener('click', async () => {
        if (catsOf(c.type).length <= 1) return err('Debe quedar al menos una categoría de este tipo.');
        const others = catsOf(c.type).filter(x => x.id !== c.id);
        const fallback = others.find(x => /otros/i.test(x.name)) || others[0];
        if (!(await confirmDlg(`¿Eliminar ${c.name}?`, 'Eliminar', true, used ? `Sus ${used} movimientos pasarán a ${esc(fallback.name)}.` : ''))) return;
        S.movements.forEach(m => { if (m.categoryId === c.id) m.categoryId = fallback.id; });
        S.recurring.forEach(r => { if (r.categoryId === c.id) r.categoryId = fallback.id; });
        delete S.budgets.cats[c.id];
        S.categories = S.categories.filter(x => x.id !== c.id);
        save(); closeSheet(); render(true); toast('Categoría eliminada');
      });
    }
  });
}

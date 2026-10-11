// Hojas de cuentas: alta/edición y conciliación con el extracto bancario.
import { $, uid, today, parseAmount, centsToInput, esc } from '../core/utils.js';
import { S, save, catsOf } from '../core/store.js';
import { ACC_TYPES } from '../core/constants.js';
import { money } from '../core/format.js';
import { accBalance } from '../core/calc.js';
import { openSheet, closeSheet, confirmDlg, toast } from '../ui/dom.js';
import { options } from '../ui/components.js';
import { render } from '../ui/render.js';

export function openAccSheet(a) {
  const isNew = !a, d = a || { name: '', type: 'banco', initial: 0, color: '#2F7DD1' };
  openSheet({
    title: isNew ? 'Nueva cuenta' : 'Editar cuenta',
    body: `
      <label class="field"><span class="lbl">Nombre</span><input id="aName" value="${esc(d.name)}" maxlength="40" placeholder="Por ejemplo, Cuenta nómina" autofocus></label>
      <div class="row2"><label class="field"><span class="lbl">Tipo</span><select id="aType">${options(Object.entries(ACC_TYPES), d.type)}</select></label>
      <label class="field"><span class="lbl">Color</span><input type="color" id="aColor" value="${esc(d.color)}"></label></div>
      <label class="field"><span class="lbl">Saldo inicial</span><input id="aInit" inputmode="decimal" value="${centsToInput(d.initial || 0)}"><small class="mut">El saldo que tenía la cuenta antes del primer movimiento que registres. Puede ser negativo.</small></label>
      <div class="err" id="aErr"></div>`,
    footer: `${isNew ? '' : '<button class="btn danger" id="aDel">Eliminar</button><span class="spacer"></span>'}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="aSave">${isNew ? 'Añadir cuenta' : 'Guardar cambios'}</button>`,
    onMount(root) {
      const err = t => { $('#aErr', root).textContent = t; };
      $('#aSave', root).addEventListener('click', () => {
        const name = $('#aName', root).value.trim(), init = parseAmount($('#aInit', root).value || '0');
        if (!name) return err('Escribe un nombre para la cuenta.');
        if (isNaN(init)) return err('El saldo inicial no es un número válido.');
        const v = { name, type: $('#aType', root).value, color: $('#aColor', root).value, initial: init };
        if (a) Object.assign(a, v); else S.accounts.push({ id: uid('acc_'), ...v });
        save(); closeSheet(); render(true); toast(a ? 'Cuenta actualizada' : 'Cuenta añadida');
      });
      if (a) $('#aDel', root).addEventListener('click', async () => {
        const used = S.movements.filter(m => m.accountId === a.id || m.toAccountId === a.id).length + S.recurring.filter(r => r.accountId === a.id).length;
        if (used) return err(`Esta cuenta tiene ${used} movimientos o recurrentes. Muévelos a otra cuenta o elimínalos antes.`);
        if (S.accounts.length <= 1) return err('Necesitas al menos una cuenta.');
        if (!(await confirmDlg(`¿Eliminar la cuenta ${a.name}?`, 'Eliminar', true))) return;
        S.accounts = S.accounts.filter(x => x.id !== a.id);
        save(); closeSheet(); render(true); toast('Cuenta eliminada');
      });
    }
  });
}

export function openReconcileSheet(a) {
  const reg = accBalance(a.id);
  openSheet({
    title: `Conciliar ${a.name}`,
    body: `
      <p class="mut" style="margin-top:0">Compara el saldo que lleva la app con el de tu extracto bancario. Si no coinciden, revisa los movimientos o registra un ajuste.</p>
      <div class="card kpi" style="background:var(--surface-2)"><div class="k-l">Saldo según la app</div><div class="k-v">${money(reg)}</div></div>
      <label class="field"><span class="lbl">Saldo según tu extracto</span><input id="rBank" inputmode="decimal" placeholder="0,00" autofocus></label>
      <div id="rDiff" class="kpi" style="margin-top:12px"></div>`,
    footer: '<button class="btn" data-close>Cerrar</button><button class="btn primary" id="rAdj" disabled>Registrar ajuste</button>',
    onMount(root) {
      let diff = 0;
      $('#rBank', root).addEventListener('input', e => {
        const v = parseAmount(e.target.value), box = $('#rDiff', root);
        if (isNaN(v)) { box.innerHTML = ''; $('#rAdj', root).disabled = true; return; }
        diff = v - reg;
        box.innerHTML = diff === 0 ? '<span class="pill ok">Cuadra al céntimo</span>'
          : `<div class="k-l">Diferencia</div><div class="k-v ${diff > 0 ? 'pos' : 'neg'}">${diff > 0 ? '+' : '−'}${money(Math.abs(diff))}</div><div class="k-s">${diff > 0 ? 'El banco tiene más dinero que la app.' : 'La app tiene más dinero que el banco.'}</div>`;
        $('#rAdj', root).disabled = diff === 0;
      });
      $('#rAdj', root).addEventListener('click', () => {
        if (!diff) return;
        const type = diff > 0 ? 'income' : 'expense';
        const cid = (catsOf(type).find(c => /otros/i.test(c.name)) || catsOf(type)[0])?.id || null;
        S.movements.push({ id: uid('m_'), type, amount: Math.abs(diff), date: today(), categoryId: cid, accountId: a.id, method: 'otro', description: 'Ajuste de conciliación', reviewed: true, created: Date.now() });
        save(); closeSheet(); render(true); toast('Ajuste registrado: la cuenta ya cuadra');
      });
    }
  });
}

// Avisos, tema, hojas inferiores y diálogos de confirmación.
import { $, esc } from '../core/utils.js';
import { S } from '../core/store.js';

let toastTimer;
export function toast(msg, kind) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'show' + (kind === 'err' ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = kind === 'err' ? 'err' : ''), 3200);
}

export function applyTheme() {
  const th = S.settings.theme;
  if (th === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', th);
}
export const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

export function openSheet({ title, body, footer, onMount }) {
  const root = $('#sheetRoot');
  root.innerHTML = `<div class="overlay"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
    <header class="sheet-h"><h2 id="sheetTitle">${esc(title)}</h2><button class="icon-btn" data-close aria-label="Cerrar">✕</button></header>
    <div class="sheet-b">${body}</div>${footer ? `<footer class="sheet-f">${footer}</footer>` : ''}</div></div>`;
  const ov = root.firstElementChild;
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-close]')) closeSheet(); });
  document.body.style.overflow = 'hidden';
  onMount && onMount(ov);
  setTimeout(() => (ov.querySelector('[autofocus]') || ov.querySelector('input,select,button'))?.focus(), 60);
}
export function closeSheet() { $('#sheetRoot').innerHTML = ''; document.body.style.overflow = ''; }
export const sheetOpen = () => !!$('#sheetRoot').innerHTML;
export const confirmOpen = () => !!$('#confirmRoot').innerHTML;

/** Diálogo de confirmación. `detail` admite HTML ya escapado. */
export function confirmDlg(msg, ok = 'Aceptar', danger = false, detail = '') {
  return new Promise(res => {
    const root = $('#confirmRoot');
    root.innerHTML = `<div class="overlay" style="z-index:60"><div class="sheet" role="alertdialog" aria-modal="true" aria-labelledby="cfT" style="max-width:420px">
      <div class="sheet-b" style="padding-top:22px"><h2 id="cfT" style="font:700 18px var(--f-num);margin:0 0 6px">${esc(msg)}</h2>${detail ? `<p class="mut" style="margin:0">${detail}</p>` : ''}</div>
      <footer class="sheet-f"><button class="btn" data-r="0">Cancelar</button><button class="btn ${danger ? 'danger' : 'primary'}" data-r="1">${esc(ok)}</button></footer></div></div>`;
    const ov = root.firstElementChild;
    const done = v => { root.innerHTML = ''; res(v); };
    ov.addEventListener('click', e => { if (e.target === ov) done(false); const b = e.target.closest('[data-r]'); if (b) done(b.dataset.r === '1'); });
    ov.addEventListener('keydown', e => { if (e.key === 'Escape') done(false); });
    setTimeout(() => ov.querySelector('[data-r="1"]').focus(), 40);
  });
}

// Instalación como app (PWA) y registro del service worker.
import { toast } from '../ui/dom.js';
import { ui } from '../ui/state.js';
import { render } from '../ui/render.js';

let installEvt = null;
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const row = (icon, title, text, btn = '') => `<div class="set-row"><span class="ic" style="--c:var(--brand)">${icon}</span><div class="t"><b>${title}</b><small>${text}</small></div>${btn}</div>`;

export function installHTML() {
  if (isStandalone()) return row('✅', 'Ya la usas como app', 'Está instalada en este dispositivo y funciona sin conexión.');
  if (installEvt) return row('📲', 'Añádela a tu pantalla de inicio', 'Se abrirá a pantalla completa, como cualquier app, y funcionará sin conexión.', '<button class="btn primary sm" data-act="install">Instalar app</button>');
  if (isIOS()) return row('📲', 'En iPhone o iPad', 'Abre esta página en Safari, toca el botón Compartir y elige «Añadir a pantalla de inicio».');
  return row('📲', 'En Android', 'Abre la página en Chrome, toca el menú ⋮ y elige «Instalar aplicación» o «Añadir a pantalla de inicio».');
}

export async function promptInstall() {
  if (!installEvt) return;
  installEvt.prompt();
  try { await installEvt.userChoice; } catch (e) { /* el usuario cerró el diálogo */ }
  installEvt = null;
  render(true);
}

export function initPWA() {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (ui.view === 'settings') render(true); });
  window.addEventListener('appinstalled', () => { installEvt = null; toast('App instalada'); if (ui.view === 'settings') render(true); });

  if (!('serviceWorker' in navigator) || window.claude || !/^https?:$/.test(location.protocol)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w && w.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) toast('Hay una versión nueva. Cierra y vuelve a abrir la app para usarla.');
        });
      });
    }).catch(err => console.warn('No se pudo activar el modo sin conexión', err));
  });
}

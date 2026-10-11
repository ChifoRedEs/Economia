// Carga diferida de Chart.js: solo se descarga cuando hace falta (o en un momento libre).
import { CHART_URL } from '../core/constants.js';

let pending = null;
export function loadChart() {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = CHART_URL; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = () => (window.Chart ? resolve(window.Chart) : reject(new Error('Chart.js no disponible')));
      s.onerror = () => { pending = null; s.remove(); reject(new Error('No se pudo cargar Chart.js')); };
      document.head.appendChild(s);
    });
  }
  return pending;
}
/** Precarga en segundo plano cuando el navegador esté libre, para que Estadísticas abra al instante. */
export function prefetchChart() {
  const go = () => loadChart().catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 5000 });
  else setTimeout(go, 2500);
}

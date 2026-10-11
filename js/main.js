// Punto de entrada de Agenda de Finanzas.
import { S } from './core/store.js';
import { setCurrency } from './core/format.js';
import { processRecurring } from './core/calc.js';
import { applyTheme, toast } from './ui/dom.js';
import { render } from './ui/render.js';
import { ACTIONS, bindEvents } from './actions.js';
import { initPWA } from './features/pwa.js';
import { prefetchChart } from './lib/chart-loader.js';

document.addEventListener('store:error', () => toast('No se han podido guardar los datos en este navegador. Exporta una copia de seguridad.', 'err'));

setCurrency(S.settings.currency);
applyTheme();
const added = processRecurring();
render();
bindEvents();
initPWA();
prefetchChart();

if (added) setTimeout(() => toast(added === 1 ? 'Se ha registrado 1 movimiento recurrente' : `Se han registrado ${added} movimientos recurrentes`), 400);

// Acceso directo «Añadir movimiento» del icono de la app.
if (new URLSearchParams(location.search).get('accion') === 'nuevo') {
  history.replaceState(null, '', location.pathname);
  setTimeout(() => ACTIONS.add(), 150);
}

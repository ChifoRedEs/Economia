// Pinta la vista activa y actualiza la navegación.
import { $, $$ } from '../core/utils.js';
import { ui } from './state.js';
import { viewHome } from '../views/home.js';
import { viewMovs, renderMovResults } from '../views/movements.js';
import { viewBook } from '../views/book.js';
import { viewStats, drawStats, destroyCharts } from '../views/stats.js';
import { viewSettings } from '../views/settings.js';

const VIEWS = { home: viewHome, movs: viewMovs, book: viewBook, stats: viewStats, settings: viewSettings };

export function render(keepScroll) {
  const y = window.scrollY;
  $('#main').innerHTML = (VIEWS[ui.view] || viewHome)();
  $$('#nav button').forEach(b => b.setAttribute('aria-current', b.dataset.view === ui.view ? 'page' : 'false'));
  if (ui.view === 'movs') renderMovResults();
  if (ui.view === 'stats') drawStats(); else destroyCharts();
  if (keepScroll) window.scrollTo(0, y);
}
/** Tras un cambio de datos: en Movimientos solo repinta la lista (conserva el foco de la búsqueda). */
export function refresh() { if (ui.view === 'movs') renderMovResults(); else render(true); }

// Estado de la interfaz (no se guarda).
import { ymNow } from '../core/utils.js';

export const ui = {
  view: 'home',
  month: ymNow(),
  showFilters: false,
  f: { q: '', type: 'all', cat: 'all', acc: 'all', from: '', to: '', min: '', max: '', sort: 'date-desc', rev: 'all' },
  stats: { range: '12m', from: '', to: '' },
  catTab: 'expense'
};
export const resetFilters = () => Object.assign(ui.f, { type: 'all', cat: 'all', acc: 'all', rev: 'all', from: '', to: '', min: '', max: '' });

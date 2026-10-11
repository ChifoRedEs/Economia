// Formato de moneda según la moneda configurada.
let NF, NFc;
export function setCurrency(cur = 'EUR') {
  try { NF = new Intl.NumberFormat('es-ES', { style: 'currency', currency: cur, useGrouping: 'always' }); NF.format(1); }
  catch (e) { NF = new Intl.NumberFormat('es-ES', { style: 'currency', currency: cur }); }
  NFc = new Intl.NumberFormat('es-ES', { style: 'currency', currency: cur, notation: 'compact', maximumFractionDigits: 1 });
}
export const money = c => NF.format((c || 0) / 100);
export const compact = v => NFc.format(v);
export const signed = (c, type) => (type === 'income' ? '+' + money(c) : type === 'expense' ? '−' + money(c) : money(c));
export const signedNet = c => (c >= 0 ? '+' : '−') + money(Math.abs(c));
export const curSymbol = () => { try { return NF.formatToParts(0).find(p => p.type === 'currency').value; } catch (e) { return '€'; } };

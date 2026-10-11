// Valores fijos de la aplicación.
export const STORAGE_KEY = 'agendaFinanzas.v1';
export const CHART_URL = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';

export const DEF_CATS = [
  ['vivienda', 'Vivienda', '🏠', 'expense', '#2F7DD1'], ['alimentacion', 'Alimentación', '🛒', 'expense', '#12936A'],
  ['transporte', 'Transporte', '🚗', 'expense', '#E36A2E'], ['suministros', 'Suministros', '💡', 'expense', '#D99A0B'],
  ['restaurantes', 'Restaurantes', '🍽️', 'expense', '#C93652'], ['ocio', 'Ocio', '🎉', 'expense', '#7B4FD6'],
  ['salud', 'Salud', '💊', 'expense', '#3BA3B5'], ['suscripciones', 'Suscripciones', '📺', 'expense', '#B04A9C'],
  ['ropa', 'Ropa', '👕', 'expense', '#8C6D3F'], ['educacion', 'Educación', '📚', 'expense', '#4C9A2A'],
  ['seguros', 'Seguros', '🛡️', 'expense', '#4F6D8F'], ['otros', 'Otros gastos', '📦', 'expense', '#6C7A89'],
  ['nomina', 'Nómina', '💼', 'income', '#155E52'], ['ventas', 'Ventas', '🛍️', 'income', '#2F7DD1'],
  ['regalos', 'Regalos', '🎁', 'income', '#B04A9C'], ['otros_ing', 'Otros ingresos', '➕', 'income', '#6C7A89']
];
export const METHODS = { tarjeta: 'Tarjeta', efectivo: 'Efectivo', transferencia: 'Transferencia', bizum: 'Bizum', domiciliacion: 'Domiciliación', otro: 'Otro' };
export const ACC_TYPES = { banco: 'Cuenta bancaria', efectivo: 'Efectivo', tarjeta: 'Tarjeta', ahorro: 'Ahorro', monedero: 'Monedero u otra' };
export const ACC_ICONS = { banco: '🏦', efectivo: '💶', tarjeta: '💳', ahorro: '🐷', monedero: '👛' };
export const CURRENCIES = { EUR: 'Euro (€)', USD: 'Dólar estadounidense ($)', GBP: 'Libra esterlina (£)', MXN: 'Peso mexicano', COP: 'Peso colombiano', ARS: 'Peso argentino', CLP: 'Peso chileno', KRW: 'Won surcoreano (₩)', CHF: 'Franco suizo' };
export const TYPE_L = { expense: 'Gasto', income: 'Ingreso', transfer: 'Transferencia' };

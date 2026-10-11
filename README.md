# Agenda de Finanzas

App web (PWA) para controlar gastos e ingresos. Vanilla JS con módulos ES6, sin dependencias de compilación. Los datos se guardan en LocalStorage.

## Estructura

```
index.html            Estructura de la página
manifest.json         Datos de instalación como app
sw.js                 Service worker (caché y modo sin conexión)
css/
  base.css            Variables de tema (claro/oscuro), reset y utilidades
  layout.css          Estructura, navegación y rejillas
  components.css      Tarjetas, listas, formularios, hojas, tablas, gráficas
js/
  main.js             Punto de entrada
  actions.js          Acciones de la interfaz (data-act) y eventos
  core/               Lógica sin interfaz
    constants.js      Categorías por defecto, métodos de pago, monedas
    utils.js          Fechas, importes en céntimos, DOM
    format.js         Formato de moneda
    store.js          Estado y guardado en LocalStorage
    calc.js           Totales, saldos, presupuestos y recurrentes (con índice en caché)
  ui/
    state.js          Estado de la interfaz (vista activa, filtros…)
    dom.js            Avisos, tema, hojas y confirmaciones
    components.js     Piezas reutilizables (filas, barras, tarjeta de saldo)
    render.js         Pinta la vista activa
  views/              Una pantalla por archivo: home, movements, book, stats, settings
  sheets/             Formularios: movimiento, cuenta y conciliación, categoría, recurrente
  features/           io.js (copias JSON/CSV e importación) y pwa.js (instalación)
  lib/chart-loader.js Carga diferida de Chart.js
icons/                Iconos de la app
```

## Publicar una versión nueva

1. Sube los cambios al repositorio.
2. En `sw.js`, aumenta `VERSION` (por ejemplo, de `finanzas-v3` a `finanzas-v4`).
3. Si creas un archivo nuevo en `css/` o `js/`, añádelo también a la lista `APP` de `sw.js`.

Sin el paso 2, el móvil seguirá usando la versión guardada en caché.

## Probar en local

Los módulos ES6 no funcionan abriendo el archivo con doble clic. Usa un servidor local:

    python -m http.server 8000

y abre http://localhost:8000

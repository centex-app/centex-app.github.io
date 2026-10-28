# Centex (versión pública)

App personal de finanzas (gastos, cartera, seguimiento de acciones/fondos, objetivos de ahorro, escenarios).
JavaScript sin frameworks ni build: los archivos se sirven tal cual. Es una PWA que se instala en el móvil.
Los datos de cada persona viven solo en el `localStorage` de su dispositivo. Se publica con GitHub Pages desde `main` en <https://centex-app.github.io>.
Todos los textos de la app y los comentarios del código están en español.

## Reglas

- **No hagas commit ni push sin confirmación explícita del usuario antes de cada uno.** Prepara los cambios, explícalos y espera el "sí".
- Lo que llega a `main` se publica al instante: es la app que usa la gente.
- **Anonimato:** el autor quiere ser anónimo. Los commits salen como `Centex` con el correo noreply de GitHub (ya configurado en `.git/config` de este repo; no lo cambies). Nunca añadas nombres, correos, datos personales ni capturas con datos reales, ni en el código ni en los mensajes de commit.
- La cuenta de GitHub es `centex-app`; la de Cloudflare (programa de precios) también es anónima, con el subdominio `centex-app`.

## Publicar una versión nueva

Cada cambio de la app lleva subida de versión, en **dos sitios** (deben coincidir):

1. `sw.js` → `const VERSION = 'centex-vX.Y.Z';` (si no cambia, los móviles siguen con la versión vieja guardada).
2. `app.js` → `const VERSION_APP = 'X.Y.Z';` (sale al final de Ajustes y va en los mensajes de contacto). La fecha de la etiqueta de Ajustes se cambia a mano.

Mensaje de commit habitual: `vX.Y.Z: qué cambia, en lenguaje sencillo`.

## Archivos

- `index.html` – esqueleto de la página (cabecera, menú, contenedor `#view`, hoja/diálogo de formularios).
- `app.js` – toda la lógica, en secciones numeradas: utilidades, datos, cálculos, gráficos, pantallas (`vInicio`, `vGastos`, `vCartera`, `vSeg`, `vObj`, `vEsc`, `vAjustes`; cada una tiene su entrada en `ROUTES`, `NAV` y `VIEWS`), formularios (`sheet*`), eventos (`ACT`) y arranque.
- `styles.css` – diseño, móvil y ordenador, modo claro/oscuro.
- `sw.js` – service worker: guarda la app para abrirla sin internet; se recarga sola cuando hay versión nueva.
- `manifest.webmanifest`, `icons/` – instalación como app.
- `tools/precios-worker.js` – programa de precios publicado en Cloudflare Workers (`https://centex-precios.centex-app.workers.dev/?q=ISIN_o_TICKER&desde=AAAA-MM-DD`). Busca en Yahoo Finance por ISIN o ticker (también `BOLSA:TICKER`) y devuelve el precio de cada día en EUR o USD (otras monedas, pasadas a euros). Si se cambia este archivo, hay que pegarlo otra vez en el editor de Cloudflare y pulsar Deploy: subirlo a GitHub no lo actualiza.
- La app pide a ese programa los precios de los fondos con ISIN, las posiciones con ticker y el índice de comparación (`loadVivo`, como mucho cada 6 horas). Para fondos usa `fp()`, para Seguimiento `autoPrecio()`.
- Cartera: cada fondo tiene `compras` [{f, venta, imp, part, est, plan}] y `plan` (aportación periódica). Las compras sin precio quedan pendientes hasta que se publica (`resolver`); las periódicas se generan solas (`generarPlanes`). Los datos antiguos (`movs`, `cartera[].ap`) se convierten con `migrarFondos`.
- Comparar con un índice (`REFS0`: MSCI World = `EUNL.DE`, S&P 500 = `SXR8.DE`, ETF de acumulación en euros; más los de `ajustes.refs`): Escenarios → Comparar (`cmpHTML`). `simulaRef` invierte en el índice los mismos euros, las mismas fechas, que cada compra. Si el índice va en dólares se pasa a euros con `EURUSD=X`.
- Contador de visitas: GoatCounter (`centex-app.goatcounter.com`, script en `index.html`; `contar()` cuenta cada pantalla). Contacto: formulario en Ajustes («¿Ideas o algún fallo?», `sheetContacto`) que envía a Formspree (`FORM_URL`), y Formspree lo reenvía al correo de Centex. Privacidad y aviso legal: en Ajustes; si cambia lo que sale a internet, hay que cambiar ese texto.
- Pendiente: los fondos van 1-4 días por detrás de MyInvestor porque Yahoo publica tarde; añadir otra fuente al programa de precios.
- Pendiente de limpiar: `loadPrecios`/`loadAcciones` aún piden `data/precios.json` y `data/acciones.json`, que en este repositorio no existen (vienen de la versión personal anterior); fallan sin más y no afectan.

## Datos en localStorage

- `centex.v1` – datos de la persona (gastos, `habOff`, `habMan`, cartera antigua, carteras, fondos, seguimiento, secciones, objetivos, ajustes). Pasa por `norm()` al cargar: cualquier campo nuevo debe tener valor por defecto en `blank()`/`norm()` para no romper datos ya guardados ni copias de seguridad antiguas.
- `centex.vivo` – precios que devuelve el programa de Cloudflare, por ISIN o ticker.
- `centex.modo` = `demo` y `centex.demo` – modo de prueba (`DEMO`): la app usa `centex.demo` en vez de `centex.v1`, con los datos de `demoData()`. Al salir se borran y vuelven los datos de verdad.
- `centex.logos` – caché de logos de empresas.
- `centex.esc` – última pestaña y valores de Escenarios.

## Probar en local

```
python -m http.server 8000
```

y abrir <http://localhost:8000>. El service worker cachea mucho: si no ves los cambios, recarga forzando o borra la caché.

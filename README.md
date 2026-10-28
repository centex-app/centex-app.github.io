# Centex

Tus gastos, tu cartera y tus objetivos de ahorro en un solo sitio.

Centex es una app de finanzas personales que funciona en el navegador y se instala en el móvil como una app más. **No tiene cuentas ni servidor: tus datos se guardan solo en tu dispositivo** y nadie más los ve.

## Qué hace

- **Gastos:** apunta lo que gastas, mira en qué se va cada mes y apunta con un toque los gastos que repites.
- **Cartera:** apunta las compras de tus fondos (importe y participaciones) y mira cuánto valen hoy, cuánto has aportado y cuánto ganas. Los precios se actualizan solos cada día.
- **Seguimiento:** sigue acciones y fondos sin dinero real y mira su rentabilidad desde que entraste.
- **Objetivos:** metas de ahorro con lo que llevas y lo que te falta.
- **Escenarios:** simula cuánto podría crecer tu dinero, si te sale a cuenta un piso para alquilar o cómo vas frente al MSCI World o el S&P 500.

## Privacidad

- Todo lo que apuntas se queda en tu dispositivo (almacenamiento local del navegador).
- Para buscar precios, la app envía solo el ISIN o el ticker de tus fondos y acciones, nunca tus importes.
- Para mostrar logos de empresas se piden a Ticker Logos (se puede desactivar en Ajustes).
- Si borras los datos del navegador o cambias de móvil, se pierden: haz copias de seguridad en Ajustes.

## Fuentes

- Precios: datos de Yahoo Finance, a través de un pequeño servicio propio (`tools/precios-worker.js`, en Cloudflare Workers).
- Logos: [Ticker Logos by AllInvestView](https://www.allinvestview.com/tools/ticker-logos/).

Centex es una herramienta para ordenar tus finanzas. **No es asesoramiento financiero.**

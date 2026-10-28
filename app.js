'use strict';
/* =====================================================================
   Centex · lógica de la app
   Todo se guarda en este dispositivo (localStorage). A internet solo se piden los logos de empresas (desactivable en Ajustes), los precios de los fondos y acciones
   que sigues (solo su ISIN o ticker, nunca importes) y un contador de visitas anónimo (GoatCounter, sin cookies).
   Estructura del archivo:
     1. utilidades      4. gráficos        7. eventos
     2. datos           5. pantallas       8. arranque
     3. cálculos        6. formularios
   ===================================================================== */

/* ---------- 1. utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const eur = (n, d = 2) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' });
const eurA = n => eur(n, Math.abs(n * 100 % 100) < 0.5 || Math.abs(n * 100 % 100) > 99.5 ? 0 : 2);
const sgn = n => (n > 0 ? '+' : n < 0 ? '−' : '');
const pct = n => sgn(n) + Math.abs(n).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
const todayISO = () => new Date().toLocaleDateString('sv-SE');
const mk = d => String(d || '').slice(0, 7);
const addM = (k, d) => { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1 + d, 1).toLocaleDateString('sv-SE').slice(0, 7); };
const between = (a, b) => { const o = []; for (let k = a; k <= b && o.length < 600; k = addM(k, 1)) o.push(k); return o; };
const mLabel = (k, long) => { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('es-ES', long ? { month: 'long', year: 'numeric' } : { month: 'short', year: '2-digit' }).replace(/\./g, ''); };
const monthName = k => { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'long' }); };
const dLabel = d => { if (!d) return '—'; const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/\./g, ''); };
const dayHead = d => {
  if (d === todayISO()) return 'Hoy';
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (d === y.toLocaleDateString('sv-SE')) return 'Ayer';
  const [yy, m, dd] = d.split('-').map(Number);
  return new Date(yy, m - 1, dd).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
};
const num = v => { const n = parseFloat(String(v == null ? '' : v).trim().replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : null; };
const fmtIn = n => (n == null ? '' : String(n).replace('.', ','));
const isIsin = s => /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(String(s || ''));
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !isNaN(new Date(s + 'T00:00:00'));
const isMonth = s => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(s || ''));
function niceStep(x) { if (x <= 0) return 10; const p = Math.pow(10, Math.floor(Math.log10(x))); const f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
const fmtAx = v => (v >= 1e6 ? (v / 1e6).toString().replace('.', ',') + ' M' : v >= 1000 ? (v / 1000).toString().replace('.', ',') + 'k' : v.toString().replace('.', ',')) + ' €';
let toastT;
function toast(m) { const t = $('#toast'); t.textContent = m; t.style.pointerEvents = ''; t.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => (t.style.display = 'none'), 2800); }

const CATS = ['Comida', 'Ocio', 'Transporte', 'Compras', 'Otros'];
const catColor = c => 'var(--s' + (Math.max(CATS.indexOf(c), 0) + 1) + ')';

const ICON = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  pie: '<path d="M12 3v9h9"/><path d="M20.5 15A9 9 0 1 1 9 3.5"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".6" fill="currentColor"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  pizza: '<path d="M12 21L4.5 7.8Q12 4 19.5 7.8z"/><circle cx="10.4" cy="10.2" r="1"/><circle cx="13.6" cy="13.4" r="1"/>',
  ticket: '<path d="M3 8a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.5a1.5 1.5 0 0 0 0 3V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2.5a1.5 1.5 0 0 0 0-3z"/><path d="M14 8.5v1M14 11.5v1M14 14.5v1"/>',
  bus: '<path d="M5 4h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M4 11h16"/><circle cx="8" cy="19" r="1.5"/><circle cx="16" cy="19" r="1.5"/><circle cx="7.5" cy="14" r=".6" fill="currentColor"/><circle cx="16.5" cy="14" r=".6" fill="currentColor"/>',
  bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/>',
  wave: '<path d="M3 20h18"/><path d="M3 16c3 0 4-9 8-9s5 6 10 6"/>',
  dots: '<circle cx="6" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18" cy="12" r="1.3" fill="currentColor"/>'
};
const icon = n => '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + ICON[n] + '</svg>';
// Icono de cada categoría de gasto, del color de la categoría. sm = versión pequeña para textos y formularios.
const CAT_ICON = { Comida: 'pizza', Ocio: 'ticket', Transporte: 'bus', Compras: 'bag', Otros: 'dots' };
const catIcon = (c, sm) => '<svg class="ic' + (sm ? ' sm' : '') + '" style="color:' + catColor(c) + '" viewBox="0 0 24 24" aria-hidden="true">' + ICON[CAT_ICON[c] || 'dots'] + '</svg>';

/* ---------- 2. datos ---------- */
// En el modo de prueba se usa otro almacén (centex.demo): los datos de verdad (centex.v1) no se tocan.
const DEMO = (() => { try { return localStorage.getItem('centex.modo') === 'demo'; } catch (e) { return false; } })();
const KEY = DEMO ? 'centex.demo' : 'centex.v1';
// Secciones de Seguimiento: por defecto Acciones y Fondos; el usuario puede añadir y borrar las suyas.
const SECS0 = () => [{ id: 'accion', nombre: 'Acciones' }, { id: 'fondo', nombre: 'Fondos' }];
function cleanSecs(a) {
  const seen = new Set(), ok = [];
  (Array.isArray(a) ? a : []).forEach(x => {
    const id = x && typeof x.id === 'string' ? x.id.slice(0, 40) : '', nombre = x ? String(x.nombre == null ? '' : x.nombre).trim().slice(0, 30) : '';
    if (id && nombre && !seen.has(id)) { seen.add(id); ok.push({ id, nombre }); }
  });
  return ok.length ? ok : SECS0();
}
// Si alguna posición apunta a una sección que no existe (copias antiguas), la crea.
function ensureSecs(secs, seg) {
  seg.forEach(p => {
    if (!p.tipo) p.tipo = 'accion';
    if (!secs.some(s => s.id === p.tipo)) secs.push({ id: p.tipo, nombre: p.tipo === 'accion' ? 'Acciones' : p.tipo === 'fondo' ? 'Fondos' : String(p.tipo).slice(0, 30) });
  });
  return secs;
}
// Carteras (una por plataforma). Cada mes apuntado lleva el id de su cartera en «c». Datos antiguos: todo cae en «Principal».
const CART0 = () => [{ id: 'principal', nombre: 'Principal' }];
function cleanCarts(a) {
  const seen = new Set(), ok = [];
  (Array.isArray(a) ? a : []).forEach(x => {
    const id = x && typeof x.id === 'string' ? x.id.slice(0, 40) : '', nombre = x ? String(x.nombre == null ? '' : x.nombre).trim().slice(0, 30) : '';
    if (id && nombre && !seen.has(id)) { seen.add(id); ok.push({ id, nombre }); }
  });
  return ok.length ? ok : CART0();
}
function ensureCarts(carts, rows) {
  rows.forEach(r => {
    if (!r.c) r.c = carts[0].id;
    if (!carts.some(x => x.id === r.c)) carts.push({ id: r.c, nombre: 'Cartera ' + (carts.length + 1) });
  });
  return carts;
}
// Fondos: cada uno es un ISIN dentro de una cartera, con sus compras y ventas y, si la tiene, su aportación periódica.
// Compra: { id, f fecha, venta, imp importe €, part participaciones, est: qué cifra se calculó con el precio ('imp'/'part'), plan: mes si la creó la periódica }.
// Si falta el importe o las participaciones, la compra está «pendiente de precio» hasta que se publique el precio de ese día.
const posN = v => typeof v === 'number' && isFinite(v) && v > 0;
const cleanPlan = p => (p && posN(p.imp) && isDate(p.desde) ? { imp: p.imp, dia: Math.min(28, Math.max(1, Math.round(+p.dia) || 1)), desde: p.desde, hasta: isDate(p.hasta) ? p.hasta : null, saltar: (Array.isArray(p.saltar) ? p.saltar.filter(isMonth) : []).slice(0, 600) } : null);
function cleanFondos(a, carts) {
  const ids = new Set(), ok = [];
  (Array.isArray(a) ? a : []).forEach(x => {
    if (!x) return;
    const isin = x.isin == null ? '' : String(x.isin).trim().toUpperCase(), nombre = String(x.nombre == null ? '' : x.nombre).trim().slice(0, 60);
    if (isin && !isIsin(isin)) return;
    if (!isin && !nombre) return;
    let id = typeof x.id === 'string' && x.id ? x.id.slice(0, 40) : 'f_' + uid(); if (ids.has(id)) id = 'f_' + uid(); ids.add(id);
    const o = { id, isin, nombre, c: carts.some(c => c.id === x.c) ? x.c : carts[0].id, plan: cleanPlan(x.plan) };
    if (Array.isArray(x.compras)) o.compras = x.compras.filter(c => c && isDate(c.f) && (posN(c.imp) || posN(c.part))).slice(0, 3000).map(c => {
      const k = { id: String(c.id || uid()).slice(0, 40), f: c.f, venta: !!c.venta, imp: posN(c.imp) ? c.imp : null, part: posN(c.part) ? c.part : null, est: c.est === 'imp' || c.est === 'part' ? c.est : null };
      if (isMonth(c.plan)) k.plan = c.plan;
      return k;
    }).sort((p, q) => (p.f < q.f ? -1 : p.f > q.f ? 1 : 0));
    else o.movs = (Array.isArray(x.movs) ? x.movs : []).filter(m => m && isDate(m.f) && (m.m === 'part' || m.m === 'eur') && typeof m.v === 'number' && isFinite(m.v) && m.v !== 0).slice(0, 300).map(m => ({ f: m.f, m: m.m, v: m.v }));
    ok.push(o);
  });
  return ok;
}
// Hasta la versión 1.15, cada fondo tenía «movs» (participaciones o importe; las ventas en negativo) y lo aportado en cada mes iba en la cartera (r.ap).
// Se pasa todo a compras una sola vez. Los meses apuntados se quedan guardados tal cual, aunque ya no se usan. Devuelve cuántas compras ha creado.
function migrarFondos(fondos, cartera) {
  let n = 0;
  fondos.forEach(fo => {
    if (Array.isArray(fo.compras)) return;
    const cs = [];
    (fo.movs || []).forEach(m => { const venta = m.v < 0, x = Math.abs(m.v); cs.push(m.m === 'part' ? { id: uid(), f: m.f, venta, imp: null, part: x, est: 'imp' } : { id: uid(), f: m.f, venta, imp: x, part: null, est: 'part' }); });
    (cartera || []).forEach(r => (Array.isArray(r.ap) ? r.ap : []).forEach(a => { if (a && a.id === fo.id && typeof a.v === 'number' && a.v && isDate(a.d)) cs.push({ id: uid(), f: a.d, venta: a.v < 0, imp: Math.abs(a.v), part: null, est: 'part' }); }));
    fo.compras = cs.sort((p, q) => (p.f < q.f ? -1 : p.f > q.f ? 1 : 0)); delete fo.movs; n += cs.length;
  });
  return n;
}
// Lo aportado a cada fondo en un mes: [{id del fondo, v importe, d día}]
function cleanAp(a) {
  return (Array.isArray(a) ? a : []).filter(x => x && typeof x.id === 'string' && x.id && typeof x.v === 'number' && isFinite(x.v) && x.v !== 0 && isDate(x.d)).slice(0, 60).map(x => ({ id: x.id.slice(0, 40), v: x.v, d: x.d }));
}
const cleanHabOff = a => [...new Set((Array.isArray(a) ? a : []).filter(k => typeof k === 'string' && k.includes('|')).map(k => k.slice(0, 120)))].slice(0, 300);
const cleanHabMan = a => (Array.isArray(a) ? a : []).filter(x => x && String(x.desc || '').trim() && typeof x.cant === 'number' && isFinite(x.cant) && x.cant > 0).slice(0, 100)
  .map(x => ({ id: String(x.id || uid()).slice(0, 40), desc: String(x.desc).trim().slice(0, 80), cat: CATS.includes(x.cat) ? x.cat : 'Otros', cant: Math.round(x.cant * 100) / 100, pago: x.pago === 'Efectivo' ? 'Efectivo' : 'Tarjeta' }));
const blank = () => ({ gastos: [], habOff: [], habMan: [], cartera: [], carteras: CART0(), fondos: [], seg: [], secciones: SECS0(), objetivos: [], ajustes: { tema: 'auto', ultimaCopia: null, cmp: '', refs: [], vista: 'pct', cmpModo: 'cartera', libre: { qs: ['EUNL.DE', 'SXR8.DE'], per: '1a' }, logos: true } });
function norm(o) {
  const b = blank(); o = o && typeof o === 'object' ? o : {};
  const seg = Array.isArray(o.seg) ? o.seg : [], cartera = Array.isArray(o.cartera) ? o.cartera : [];
  const carteras = ensureCarts(cleanCarts(o.carteras), cartera), fondos = cleanFondos(o.fondos, carteras), mig = migrarFondos(fondos, cartera);
  return {
    gastos: Array.isArray(o.gastos) ? o.gastos : [], habOff: cleanHabOff(o.habOff), habMan: cleanHabMan(o.habMan), cartera, carteras, fondos,
    seg, secciones: ensureSecs(cleanSecs(o.secciones), seg), objetivos: Array.isArray(o.objetivos) ? o.objetivos : [],
    ajustes: Object.assign(b.ajustes, o.ajustes || {}, mig ? { avisoCompras: true } : {})
  };
}
let D;
try { D = norm(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { D = blank(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { toast('No he podido guardar en este navegador'); } }

// Reparto de la cartera de un mes: modo 'pct' (valores en %) o 'eur' (valores en €). Opcional.
function cleanRep(r) {
  if (!r || typeof r !== 'object' || !Array.isArray(r.items)) return null;
  const items = r.items.filter(i => i && String(i.n == null ? '' : i.n).trim() && (typeof i.v === 'number' ? i.v : num(i.v)) > 0).slice(0, 40).map(i => { const o = { n: String(i.n).trim().slice(0, 40), v: typeof i.v === 'number' ? i.v : num(i.v) }; if (typeof i.id === 'string' && i.id) o.id = i.id.slice(0, 40); return o; });
  return items.length ? { modo: r.modo === 'eur' ? 'eur' : 'pct', items } : null;
}
// Limpia un archivo importado: solo deja lo que tiene el formato correcto.
function cleanData(o) {
  o = o && typeof o === 'object' ? o : {};
  const s = (v, max = 200) => String(v == null ? '' : v).slice(0, max);
  const n = v => { const x = typeof v === 'number' ? v : num(v); return isFinite(x) ? x : null; };
  const arr = k => (Array.isArray(o[k]) ? o[k] : []);
  const seg = arr('seg').filter(x => x && s(x.nombre) && s(x.grupo)).map(x => ({ id: s(x.id || uid(), 40), tipo: s(x.tipo, 40).trim() || 'accion', grupo: s(x.grupo, 60), nombre: s(x.nombre, 80), ticker: s(x.ticker, 30), web: webClean(x.web), fecha: isDate(x.fecha) ? x.fecha : null, precioEntrada: n(x.precioEntrada), precioActual: n(x.precioActual), motivo: s(x.motivo, 400) }));
  const cartera = arr('cartera').filter(x => x && isMonth(x.mes)).map(x => { const o2 = { c: s(x.c, 40), mes: x.mes, aportado: n(x.aportado) || 0, valor: n(x.valor) }, rp = cleanRep(x.rep), ap = cleanAp(x.ap); if (rp) o2.rep = rp; if (ap.length) o2.ap = ap; return o2; });
  const carteras = ensureCarts(cleanCarts(o.carteras), cartera);
  return {
    gastos: arr('gastos').filter(x => x && isDate(x.fecha) && n(x.cant) != null).map(x => ({ id: s(x.id || uid(), 40), fecha: x.fecha, desc: s(x.desc, 80), cat: CATS.includes(x.cat) ? x.cat : 'Otros', cant: n(x.cant), pago: x.pago === 'Efectivo' ? 'Efectivo' : 'Tarjeta' })),
    habOff: cleanHabOff(o.habOff), habMan: cleanHabMan(o.habMan), cartera, carteras, fondos: cleanFondos(o.fondos, carteras),
    seg, secciones: ensureSecs(cleanSecs(o.secciones), seg),
    objetivos: arr('objetivos').filter(x => x && s(x.nombre) && n(x.meta) > 0).map(x => ({ id: s(x.id || uid(), 40), nombre: s(x.nombre, 60), meta: n(x.meta), ahorrado: n(x.ahorrado) || 0, fecha: isDate(x.fecha) ? x.fecha : null }))
  };
}

/* ---------- 3b. logos de empresas ----------
   Servicio: Ticker Logos (cdn.tickerlogos.com/<dominio>), sin cuenta. Hay que mostrar el crédito "Logos by AllInvestView".
   Se descargan una vez y se guardan en este dispositivo (clave aparte: centex.logos). Si no hay logo, círculo con iniciales. */
const LOGO_KEY = 'centex.logos', LOGO_MAX = 120, LOGO_MISS_MS = 7 * 864e5;
const TICKER_DOM = { AAPL: 'apple.com', MSFT: 'microsoft.com', GOOGL: 'google.com', GOOG: 'google.com', AMZN: 'amazon.com', TSLA: 'tesla.com', NVDA: 'nvidia.com', META: 'meta.com', NFLX: 'netflix.com', QCOM: 'qualcomm.com', AMD: 'amd.com', INTC: 'intel.com', MNST: 'monsterbevcorp.com', KO: 'coca-colacompany.com', PEP: 'pepsico.com', BE: 'bloomenergy.com', HCA: 'hcahealthcare.com', DIS: 'disney.com', V: 'visa.com', MA: 'mastercard.com', JPM: 'jpmorganchase.com', WMT: 'walmart.com', NKE: 'nike.com', MCD: 'mcdonalds.com', SBUX: 'starbucks.com', ADBE: 'adobe.com', CRM: 'salesforce.com', ORCL: 'oracle.com', IBM: 'ibm.com', AVGO: 'broadcom.com', TSM: 'tsmc.com', ASML: 'asml.com', SAP: 'sap.com', ITX: 'inditex.com', SAN: 'santander.com', BBVA: 'bbva.com', TEF: 'telefonica.com', IBE: 'iberdrola.com', REP: 'repsol.com', AMS: 'amadeus.com', CABK: 'caixabank.com', PYPL: 'paypal.com', UBER: 'uber.com', PLTR: 'palantir.com', COIN: 'coinbase.com' };
const NAME_DOM = { monster: 'monsterbevcorp.com', nextil: 'nextil.com', alphabet: 'google.com', facebook: 'meta.com', ishares: 'ishares.com', vanguard: 'vanguard.com', amundi: 'amundi.com', blackrock: 'blackrock.com', fidelity: 'fidelity.com', ssga: 'ssga.com', xtrackers: 'dws.com', invesco: 'invesco.com' };
const SLUG_STOP = ['inc', 'corp', 'corporation', 'incorporated', 'co', 'company', 'sa', 'plc', 'ag', 'nv', 'se', 'ltd', 'group', 'holdings', 'holding', 'the', 'de', 'la', 'el', 'sl', 'sas'];
const slugName = n => String(n || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w && !SLUG_STOP.includes(w));
function webClean(v) {
  const t = String(v == null ? '' : v).trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[\/?#\s]/)[0].slice(0, 80);
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(t) ? t : '';
}
// Posibles dominios de una empresa, por orden de fiabilidad: web escrita a mano > ticker conocido > nombre.
function logoCands(nombre, ticker, web) {
  const out = [], add = d => { if (d && !out.includes(d)) out.push(d); };
  add(webClean(web));
  const tk = String(ticker || '').trim().toUpperCase().replace(/\..*$/, '');
  if (/^[A-Z]{1,5}$/.test(tk)) add(TICKER_DOM[tk]);
  const w = slugName(nombre), j = w.join('');
  for (const k of Object.keys(NAME_DOM)) if (j.startsWith(k)) add(NAME_DOM[k]);
  if (j.length >= 3) add(j + '.com');
  return out.slice(0, 4);
}
let LC = {};
try { LC = JSON.parse(localStorage.getItem(LOGO_KEY) || '{}') || {}; } catch (e) { LC = {}; }
function lcSave() {
  const ks = Object.keys(LC); if (ks.length > LOGO_MAX) ks.slice(0, ks.length - LOGO_MAX).forEach(k => { delete LC[k]; });
  try { localStorage.setItem(LOGO_KEY, JSON.stringify(LC)); } catch (e) { /* sin sitio: se vuelve a pedir */ }
}
const initials = n => { const w = String(n || '?').trim().split(/\s+/); return ((w[0] || '?')[0] + (w.length > 1 ? w[1][0] : '')).toUpperCase(); };
const hueOf = n => { let h = 0; for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
function logoHTML(nombre, cands, small) {
  return '<span class="lg' + (small ? ' sm' : '') + '" aria-hidden="true" style="--h:' + hueOf(nombre) + '"' + (cands.length ? ' data-lg="' + esc(cands.join(',')) + '"' : '') + '>' + esc(initials(nombre)) + '</span>';
}
const posLogo = p => logoHTML(p.nombre, logoCands(p.nombre, p.ticker, p.web));
function applyLogo(el) {
  if (!el.dataset.lg || el.classList.contains('has')) return;
  for (const d of el.dataset.lg.split(',')) {
    const v = LC[d];
    if (typeof v === 'string') { el.classList.add('has'); el.textContent = ''; const im = new Image(); im.alt = ''; im.src = v; el.appendChild(im); return; }
    if (typeof v === 'number' && Date.now() + v < LOGO_MISS_MS) continue;   // sin logo conocido (negativo = hora del fallo)
    if (!LQ.failed.has(d)) { lqPush(d); return; }
  }
}
const LQ = { q: [], run: false, failed: new Set(), until: 0 };
function lqPush(d) { if (!LQ.q.includes(d)) LQ.q.push(d); if (!LQ.run) { LQ.run = true; setTimeout(lqPump, 50); } }
async function lqPump() {
  while (LQ.q.length && D.ajustes.logos) {
    if (Date.now() < LQ.until) break;
    const d = LQ.q.shift();
    try {
      const r = await fetch('https://cdn.tickerlogos.com/' + encodeURIComponent(d), { referrerPolicy: 'origin' });
      if (r.status === 429) { LQ.until = Date.now() + 60000; LQ.failed.add(d); }
      else if (r.status === 404) LC[d] = -Date.now();
      else if (r.ok && /^image\//.test(r.headers.get('content-type') || '')) {
        const b = await r.blob();
        if (b.size > 60000) LC[d] = -Date.now();
        else LC[d] = await new Promise((ok, no) => { const f = new FileReader(); f.onload = () => ok(f.result); f.onerror = no; f.readAsDataURL(b); });
      } else LQ.failed.add(d);
      lcSave();
    } catch (e) { LQ.failed.add(d); }   // sin conexión: se reintenta al reabrir la app
    document.querySelectorAll('.lg[data-lg]:not(.has)').forEach(applyLogo);
    await new Promise(ok => setTimeout(ok, 160));
  }
  LQ.run = false;
}
function hydrateLogos() { if (D.ajustes.logos) document.querySelectorAll('.lg[data-lg]').forEach(applyLogo); }
const CREDIT = '<a href="https://www.allinvestview.com/tools/ticker-logos/" target="_blank" rel="noopener">Logos by AllInvestView</a>';

/* ---------- 3c. precios diarios de los fondos ----------
   Una tarea de GitHub guarda cada día el último precio de los fondos en data/precios.json (mismo sitio que la app).
   Aquí se leen, se guardan en el móvil para tenerlos sin internet, y con las participaciones que apuntas se calcula el valor de cada día. */
const PKEY = 'centex.precios', AKEY = 'centex.acciones', VKEY = 'centex.vivo';
let PR = {}, AC = {}, VV = {};
try { VV = JSON.parse(localStorage.getItem(VKEY) || '{}') || {}; } catch (e) { VV = {}; }
try { PR = JSON.parse(localStorage.getItem(PKEY) || '{}') || {}; } catch (e) { PR = {}; }
try { AC = JSON.parse(localStorage.getItem(AKEY) || '{}') || {}; } catch (e) { AC = {}; }
// Precios de un fondo: junta data/precios.json, data/acciones.json y lo que devuelve el programa de precios (VV), solo en euros.
// Si dos fuentes tienen el mismo día, manda la primera. Se recuerda el resultado hasta que llegan precios nuevos.
const vKey = s => String(s || '').trim().toUpperCase();
const enEur = x => (x && !x.err && x.moneda === 'EUR' ? x : null);
const fpMemo = new Map();
function fp(isin) {
  if (fpMemo.has(isin)) return fpMemo.get(isin);
  const ss = [PR[isin], enEur(AC[isin]), enEur(VV[isin])].filter(Boolean);
  const r = ss.length ? { nombre: (ss.find(x => x.nombre) || {}).nombre || isin, moneda: 'EUR', precios: Object.assign({}, ...ss.map(x => x.precios || {}).reverse()) } : null;
  if (r) r.ds = Object.keys(r.precios).sort();
  fpMemo.set(isin, r); return r;
}
const pDates = isin => (fp(isin) || {}).ds || [];
function buscaAntes(ser, d) {   // último precio con fecha <= d
  const ds = (ser && ser.ds) || []; let lo = 0, hi = ds.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (ds[m] <= d) lo = m + 1; else hi = m; }
  return lo ? { f: ds[lo - 1], p: ser.precios[ds[lo - 1]] } : null;
}
function buscaDesde(ser, d) {   // primer precio con fecha >= d (el que aplica a una compra hecha ese día), como mucho 10 días después
  const ds = (ser && ser.ds) || []; let lo = 0, hi = ds.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (ds[m] < d) lo = m + 1; else hi = m; }
  return lo < ds.length && (Date.parse(ds[lo]) - Date.parse(d)) / 864e5 <= 10 ? { f: ds[lo], p: ser.precios[ds[lo]] } : null;
}
const priceAt = (isin, d) => buscaAntes(fp(isin), d), priceFrom = (isin, d) => buscaDesde(fp(isin), d);
const normN = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
const fNombre = fo => fo.nombre || (fp(fo.isin) || {}).nombre || fo.isin || 'Fondo';
const byF = (a, b) => (a.f < b.f ? -1 : a.f > b.f ? 1 : 0);
const red2 = x => Math.round(x * 100) / 100, redP = x => Math.round(x * 1e6) / 1e6;
const uFmt = u => u.toLocaleString('es-ES', { maximumFractionDigits: 4 });
const precioFmt = p => p.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + ' €';
// Completa las compras a las que les falta el importe o las participaciones, en cuanto hay precio de ese día. Una vez completas, ya no cambian.
function resolver() {
  let cambio = false;
  D.fondos.forEach(fo => { if (fo.isin) fo.compras.forEach(c => {
    if (c.imp != null && c.part != null) return;
    const pa = priceFrom(fo.isin, c.f); if (!pa) return;
    if (c.part == null) c.part = redP(c.imp / pa.p); else c.imp = red2(c.part * pa.p);
    cambio = true;
  }); });
  return cambio;
}
// Aportación periódica: apunta sola la compra de cada mes (el día elegido) desde «desde» hasta hoy o «hasta». Las borradas a mano no vuelven.
function generarPlanes() {
  let n = 0; const hoy = todayISO();
  D.fondos.forEach(fo => {
    const p = fo.plan; if (!p) return;
    const fin = mk(p.hasta && p.hasta < hoy ? p.hasta : hoy); let antes = n;
    for (let m = mk(p.desde), k = 0; m <= fin && k < 600; m = addM(m, 1), k++) {
      const f = m + '-' + String(p.dia).padStart(2, '0');
      if (f < p.desde || f > hoy || (p.hasta && f > p.hasta) || p.saltar.includes(m) || fo.compras.some(c => c.plan === m)) continue;
      fo.compras.push({ id: uid(), f, venta: false, imp: p.imp, part: null, est: 'part', plan: m }); n++;
    }
    if (n > antes) fo.compras.sort(byF);
  });
  return n;
}
const sgnC = c => (c.venta ? -1 : 1);
// Cómo estaba un fondo un día: participaciones, aportado neto (compras − ventas) y valor. Lo pendiente de precio cuenta por lo que costó;
// un fondo sin ningún precio (sin ISIN) vale lo aportado.
function fondoEn(fo, d) {
  let u = 0, pend = 0, ap = 0;
  fo.compras.forEach(c => { if (c.f > d) return; if (c.part != null) u += sgnC(c) * c.part; else pend += sgnC(c) * c.imp; if (c.imp != null) ap += sgnC(c) * c.imp; });
  const pa = fo.isin ? priceAt(fo.isin, d) : null;
  return { u, ap, pa, val: pa ? u * pa.p + pend : ap };
}
function fondoInfo(fo) {
  const r = fondoEn(fo, '9999-12-31'), bruto = fo.compras.reduce((a, c) => a + (!c.venta && c.imp != null ? c.imp : 0), 0), gan = r.val - r.ap;
  return Object.assign(r, { bruto, gan, pct: bruto > 0 ? (gan / bruto) * 100 : null, pend: fo.isin ? fo.compras.filter(c => c.imp == null || c.part == null).length : 0 });
}
function totalFondos(fl) {
  const t = { val: 0, ap: 0, bruto: 0, pend: 0, n: 0, ult: null, inf: [] };
  fl.forEach(fo => { const i = fondoInfo(fo); t.inf.push(Object.assign({ fo }, i)); t.val += i.val; t.ap += i.ap; t.bruto += i.bruto; t.pend += i.pend; t.n += fo.compras.length; if (i.pa && (!t.ult || i.pa.f > t.ult)) t.ult = i.pa.f; });
  t.gan = t.val - t.ap; t.pct = t.bruto > 0 ? (t.gan / t.bruto) * 100 : null;
  return t;
}
/* Comparar con un índice o fondo: «¿cuánto tendría si cada compra la hubiera hecho, el mismo día y con los mismos euros, en el índice?».
   Los índices propuestos son su versión en euros que reinvierte dividendos (ETF de acumulación en Xetra), para que sea justo con fondos de acumulación.
   Si se elige uno que cotiza en dólares, se pasa a euros con el cambio de cada día (EURUSD=X). */
const REFS0 = [['EUNL.DE', 'MSCI World'], ['SXR8.DE', 'S&P 500']];
const refsTodas = () => REFS0.concat((D.ajustes.refs || []).map(r => [r.q, r.n]));
const refNombre = q => { const r = refsTodas().find(x => x[0] === q); return r && r[1] !== q ? r[1] : ((VV[q] || {}).nombre || q); };
const refMemo = new Map();
function refSerie(q) {   // precios en euros, con las fechas ordenadas
  if (refMemo.has(q)) return refMemo.get(q);
  const v = VV[q]; let r = null;
  if (v && !v.err) {
    if (v.moneda === 'EUR') r = { precios: v.precios };
    else { const fx = VV['EURUSD=X']; if (fx && !fx.err) { const fs = { ds: Object.keys(fx.precios).sort(), precios: fx.precios }, ps = {}; Object.keys(v.precios).forEach(d => { const t = buscaAntes(fs, d) || buscaDesde(fs, d); if (t) ps[d] = v.precios[d] / t.p; }); r = { precios: ps }; } }
    if (r) r.ds = Object.keys(r.precios).sort();
  }
  refMemo.set(q, r); return r;
}
// Devuelve una función: día → cuánto valdría ese día lo invertido en el índice (null si aún no hay precios).
function simulaRef(fl, q) {
  const ser = refSerie(q); if (!ser || !ser.ds.length) return null;
  const movs = fl.flatMap(fo => fo.compras.filter(c => c.imp != null)).sort(byF);
  return d => { let u = 0; for (const c of movs) { if (c.f > d) break; const pa = buscaDesde(ser, c.f) || buscaAntes(ser, c.f); if (pa) u += sgnC(c) * c.imp / pa.p; } const pd = buscaAntes(ser, d); return pd ? u * pd.p : null; };
}
const refEstado = q => (VV[q] && VV[q].err ? 'No encuentro «' + esc(q) + '»: revisa el ISIN o el ticker.' : 'Cargando los precios de ' + esc(refNombre(q)) + '…');
const gTxt = g => '<span class="' + (g >= 0 ? 'dn-t' : 'up-t') + '">' + (g >= 0 ? '▲ ' : '▼ ') + sgn(g) + eur(Math.abs(g)) + '</span>';
// Añadir un índice o fondo propio a la lista de comparación.
function sheetRef() {
  openSheet('Comparar con otro índice o fondo',
    '<div class="form"><div class="fld"><label for="rQ">ISIN o ticker</label><input id="rQ" name="q" maxlength="24" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="IE00B4L5Y983, EUNL.DE, ^IBEX…" style="text-transform:uppercase"><span class="help">Mejor uno de acumulación (que reinvierte dividendos) y en euros. Si cotiza en dólares, la app lo pasa a euros.</span></div>' +
    '<div class="fld"><label for="rN">Nombre (opcional)</label><input id="rN" name="n" maxlength="40" autocomplete="off" placeholder="MSCI ACWI"></div>' + actions('', 'Añadir') + '</div>',
    fd => {
      const q = vKey(fd.get('q')), n = String(fd.get('n') || '').trim().slice(0, 40);
      if (!/^[A-Z0-9.\-^=:]{1,24}$/.test(q)) return 'Pon un ISIN o un ticker.';
      D.ajustes.refs = (D.ajustes.refs || []).filter(r => r.q !== q).concat(REFS0.some(r => r[0] === q) ? [] : [{ q, n: n || q }]).slice(-8);
      D.ajustes.cmp = q;
      save(); render(); setTimeout(loadVivo, 50);
    });
  setTimeout(() => { const i = $('#rQ'); if (i) i.focus(); }, 60);
}
// Valor y aportado de un grupo de fondos cada día, desde la primera compra. Si un fondo no publica precio un día, se arrastra el último.
// Con q, también lo que valdría lo mismo invertido en ese índice (r).
function serieCartera(fl, q) {
  const cs = fl.flatMap(fo => fo.compras.map(c => c.f)).sort(); if (!cs.length) return [];
  const desde = cs[0], hoy = todayISO();
  const dias = [...new Set(fl.flatMap(fo => (fo.isin ? pDates(fo.isin) : [])).concat(cs))].filter(d => d >= desde && d <= hoy).sort();
  const sim = q ? simulaRef(fl, q) : null;
  return dias.map(d => { let v = 0, a = 0; fl.forEach(fo => { const r = fondoEn(fo, d); v += r.val; a += r.ap; }); return { d, v, a, r: sim ? sim(d) : null }; });
}

async function loadPrecios() {
  try {
    const r = await fetch('data/precios.json', { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    if (!j || typeof j !== 'object') return;
    const clean = {};
    for (const isin of Object.keys(j)) {
      if (!isIsin(isin) || !j[isin] || typeof j[isin].precios !== 'object') continue;
      const ps = {}; for (const d of Object.keys(j[isin].precios)) { const p = j[isin].precios[d]; if (isDate(d) && typeof p === 'number' && isFinite(p) && p > 0) ps[d] = p; }
      clean[isin] = { nombre: String(j[isin].nombre || isin).slice(0, 90), moneda: 'EUR', precios: ps };
    }
    if (JSON.stringify(clean) === JSON.stringify(PR)) return;
    PR = clean; fpMemo.clear(); if (resolver()) save(); try { localStorage.setItem(PKEY, JSON.stringify(PR)); } catch (e) { /* nada */ }
    if (route() === 'cartera' && !document.querySelector('#sheet[open]')) render();
  } catch (e) { /* sin conexión: se usan los precios guardados */ }
}

/* ---------- 3d. precios diarios de las acciones de Seguimiento ----------
   La misma tarea de GitHub guarda en data/acciones.json el cierre de cada día de las acciones de tools/acciones.txt.
   Cada una va en su moneda (euros o dólares); las que cotizan en otra llegan ya pasadas a euros. */
const isTk = s => /^[A-Z0-9.\-^=]{1,20}$/.test(String(s || ''));
// Último precio automático de una posición: de la lista de GitHub (sin la bolsa delante: «NASDAQ:TSLA» → TSLA), de los fondos si es un ISIN,
// o del programa de precios. Si hay varias, la que tenga el día más reciente.
function autoPrecio(p) {
  const full = vKey(p.ticker), k = full.replace(/^[A-Z]+:/, '');
  let best = null;
  [AC[k], isIsin(k) && fp(k), VV[full] && !VV[full].err && VV[full]].forEach(src => {
    if (!src) return;
    const ds = Object.keys(src.precios || {}).sort(), f = ds[ds.length - 1];
    if (f && (!best || f > best.f)) best = { p: src.precios[f], f, moneda: src.moneda };
  });
  return best;
}
/* ---------- 3e. precios al momento: programa propio en Cloudflare (tools/precios-worker.js) ----------
   Para cada fondo con ISIN y cada posición con ticker, pide el precio de cada día desde la primera compra (o la fecha de entrada).
   Se guarda en el móvil y se vuelve a pedir como mucho cada 6 horas; si algo no existe, se reintenta al día siguiente. */
const API = 'https://centex-precios.centex-app.workers.dev/';
const V_FRESCO = 6 * 36e5, V_ERR = 24 * 36e5;
const vUlt = v => { const ds = Object.keys((v && v.precios) || {}).sort(); return ds[ds.length - 1] || null; };
// Qué hace falta pedir: código → primer día que interesa (como mínimo, el último mes).
function vNecesarios() {
  const mes = new Date(Date.now() - 31 * 864e5).toLocaleDateString('sv-SE'), out = new Map();
  const add = (q, desde) => { q = vKey(q); if (!/^[A-Z0-9.\-^=:]{1,24}$/.test(q)) return; const d = isDate(desde) && desde < mes ? desde : mes; if (!out.has(q) || d < out.get(q)) out.set(q, d); };
  D.fondos.forEach(fo => { if (fo.isin) add(fo.isin, fo.compras.map(c => c.f).sort()[0]); });
  D.seg.forEach(x => { if (x.ticker) add(x.ticker, x.fecha); });
  const primera = D.fondos.flatMap(fo => fo.compras.map(c => c.f)).sort()[0], cmps = [D.ajustes.cmp].filter(Boolean), L = D.ajustes.cmpModo === 'activos' ? libreCfg() : { qs: [], per: '1a' };   // los de «Activos», solo si se usa
  L.qs.forEach(q => add(q, libreDesde(L.per)));
  cmps.forEach(q => add(q, primera));
  if (cmps.some(q => !REFS0.some(r => r[0] === q))) add('EURUSD=X', primera);
  if (L.qs.length) add('EURUSD=X', libreDesde(L.per));
  return out;
}
let vRun = false, vOtraVez = false;
async function loadVivo() {
  if (navigator.onLine === false) return;
  if (vRun) { vOtraVez = true; return; }   // ya está pidiendo: al terminar, vuelve a mirar qué falta
  vRun = true; vOtraVez = false; let cambio = false;
  try {
    const nec = vNecesarios();
    Object.keys(VV).forEach(q => { if (!nec.has(q)) { delete VV[q]; cambio = true; } });   // lo que ya no sigues
    const toca = [...nec].filter(([q, d]) => { const v = VV[q]; return !v || Date.now() - v.t > (v.err ? V_ERR : V_FRESCO) || (!v.err && d < v.desde); });
    // Se piden de 4 en 4 a la vez: con una cartera nueva, de uno en uno tardaría varios segundos por activo.
    const cola = toca.slice(0, 40); let sinRed = false;
    const pedir = async ([q, desde]) => {
      const v = VV[q] && !VV[q].err ? VV[q] : null, u = v && v.desde <= desde && vUlt(v);
      // Si ya está el historial, solo se piden los últimos días.
      const pide = u ? new Date(Date.parse(u + 'T00:00:00') - 7 * 864e5).toLocaleDateString('sv-SE') : desde;
      let r, j;
      try { r = await fetch(API + '?q=' + encodeURIComponent(q) + '&desde=' + pide); j = await r.json().catch(() => null); } catch (e) { sinRed = true; return; }
      if (r.ok && j && j.precios) {
        const ps = {}; for (const d of Object.keys(j.precios)) { const x = j.precios[d]; if (isDate(d) && typeof x === 'number' && isFinite(x) && x > 0) ps[d] = x; }
        VV[q] = { nombre: String(j.nombre || q).slice(0, 90), moneda: j.moneda === 'USD' ? 'USD' : 'EUR', precios: Object.assign(v ? v.precios : {}, ps), desde: v && v.desde < desde ? v.desde : desde, t: Date.now() };
        cambio = true;
      } else if (r.status === 400 || r.status === 404) { VV[q] = { err: String((j && j.error) || 'No encontrado').slice(0, 120), t: Date.now() }; cambio = true; }
      // Otros fallos (Yahoo no responde…): se reintenta la próxima vez que se abra la app.
    };
    await Promise.all([0, 1, 2, 3].map(async () => { while (cola.length && !sinRed) await pedir(cola.shift()); }));
  } finally { vRun = false; if (vOtraVez) setTimeout(loadVivo, 0); }
  if (!cambio) return;
  fpMemo.clear(); refMemo.clear(); if (resolver()) save();
  try { localStorage.setItem(VKEY, JSON.stringify(VV)); } catch (e) { /* sin sitio: se vuelve a pedir */ }
  if ((['seguimiento', 'inicio', 'cartera'].includes(route()) || (route() === 'escenarios' && ui.escTipo === 'cmp')) && !document.querySelector('#sheet[open]')) render();
}
const vErr = q => { const v = VV[vKey(q)]; return v && v.err ? v.err : null; };
async function loadAcciones() {
  try {
    const r = await fetch('data/acciones.json', { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    if (!j || typeof j !== 'object') return;
    const clean = {};
    for (const k of Object.keys(j)) {
      if (!isTk(k) || !j[k] || typeof j[k].precios !== 'object') continue;
      const ps = {}; for (const d of Object.keys(j[k].precios)) { const p = j[k].precios[d]; if (isDate(d) && typeof p === 'number' && isFinite(p) && p > 0) ps[d] = p; }
      clean[k] = { nombre: String(j[k].nombre || k).slice(0, 90), moneda: j[k].moneda === 'USD' ? 'USD' : 'EUR', precios: ps };
    }
    if (JSON.stringify(clean) === JSON.stringify(AC)) return;
    AC = clean; fpMemo.clear(); if (resolver()) save(); try { localStorage.setItem(AKEY, JSON.stringify(AC)); } catch (e) { /* nada */ }
    if (['seguimiento', 'inicio', 'cartera'].includes(route()) && !document.querySelector('#sheet[open]')) render();
  } catch (e) { /* sin conexión: se usan los precios guardados */ }
}

/* ---------- 3. cálculos ---------- */
/* Gastos habituales: misma descripción y categoría apuntada 2 veces en 30 días, en cualquier momento (no solo este mes).
   Una vez lo es, sigue en la lista hasta que se quite; los quitados (D.habOff) no vuelven a entrar solos. Los gastos sin descripción no cuentan.
   También se pueden añadir a mano (D.habMan): salen aunque no se hayan apuntado nunca, y su precio es el que se puso al añadirlos. */
const habKey = x => normN(x.desc) + '|' + x.cat;
const diasEntre = (a, b) => (new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5;
function habituales() {
  const g = new Map(), out = [];
  D.gastos.forEach(x => { if (!normN(x.desc)) return; const k = habKey(x); if (!g.has(k)) g.set(k, []); g.get(k).push(x); });
  g.forEach((xs, k) => {
    if (D.habOff.includes(k)) return;
    xs.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
    if (!xs.some((x, i) => i && diasEntre(xs[i - 1].fecha, x.fecha) < 30)) return;
    // Nombre: como más veces se ha escrito (si empatan, el más reciente). Precio y forma de pago: los del último.
    const u = xs[xs.length - 1], nv = new Map(); xs.forEach(x => { const d = x.desc.trim(); nv.set(d, (nv.get(d) || 0) + 1); });
    const desc = [...nv].reduce((a, b) => (b[1] >= a[1] ? b : a))[0];
    out.push({ k, desc, cat: u.cat, cant: u.cant, pago: u.pago, ult: u.fecha, xs });
  });
  D.habMan.forEach(m => {
    const k = habKey(m); if (D.habOff.includes(k)) return;
    const h = out.find(x => x.k === k), xs = g.get(k) || [];
    if (h) Object.assign(h, { desc: m.desc, cant: m.cant, pago: m.pago, man: m.id });
    else out.push({ k, desc: m.desc, cat: m.cat, cant: m.cant, pago: m.pago, ult: xs.length ? xs[xs.length - 1].fecha : null, xs, man: m.id });
  });
  return out;
}

function monthRange() {
  const now = mk(todayISO()), ks = D.gastos.map(g => mk(g.fecha));
  if (!ks.length) return [now];
  const first = ks.reduce((a, b) => (a < b ? a : b)), last = ks.reduce((a, b) => (a > b ? a : b));
  return between(first, last > now ? last : now);
}
const totMonth = k => D.gastos.filter(x => mk(x.fecha) === k).reduce((s, x) => s + x.cant, 0);
const totCat = (k, c) => D.gastos.filter(x => mk(x.fecha) === k && x.cat === c).reduce((s, x) => s + x.cant, 0);
// Escenarios: interés compuesto mes a mes. La rentabilidad anual se reparte en 12 meses y la aportación entra a final de cada mes.
const rmOf = r => Math.pow(1 + r / 100, 1 / 12) - 1;
const fvOf = (p, a, rm, n) => (rm === 0 ? p + a * n : p * Math.pow(1 + rm, n) + (a * (Math.pow(1 + rm, n) - 1)) / rm);
// Precio de hoy de una posición: el automático si lo hay; si no, el apuntado a mano. Entrada y precio de hoy van en la misma moneda.
const precioHoy = p => { const a = autoPrecio(p); return a ? a.p : p.precioActual; };
const monedaPos = p => { const a = autoPrecio(p); return a ? a.moneda : 'EUR'; };
const money = (n, m) => (m === 'USD' ? n.toLocaleString('es-ES', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' }) : eur(n));
const rentPos = p => { const e = p.precioEntrada, a = precioHoy(p); return e > 0 && a > 0 ? ((a - e) / e) * 100 : null; };
const monthsLeft = f => { const t = todayISO(), a = t.split('-').map(Number), b = f.split('-').map(Number); return (b[0] - a[0]) * 12 + (b[1] - a[1]); };

/* ---------- 4. gráficos (SVG dibujado a mano) ---------- */
const empty = m => '<div class="empty">' + m + '</div>';
function drawStack(el, months) {
  if (!el) return;
  const rows = months.map(k => { const o = { k, t: totMonth(k) }; CATS.forEach(c => (o[c] = totCat(k, c))); return o; });
  const mx = Math.max(0, ...rows.map(o => o.t));
  if (!mx) { el.innerHTML = empty('Todavía no hay gastos. Apunta el primero con el botón + y aquí verás cómo se reparte cada mes.'); return; }
  const W = Math.max(el.clientWidth, 260), H = 240, L = 50, R = 8, T = 22, B = 28;
  const step = niceStep(mx / 4), top = Math.ceil(mx / step) * step, iw = W - L - R, ih = H - T - B, band = iw / rows.length, bw = Math.min(44, band * 0.62);
  const y = v => T + ih - (v / top) * ih;
  let s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Gasto por mes y categoría">';
  for (let v = 0; v <= top + 1e-9; v += step) s += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + fmtAx(Math.round(v * 100) / 100) + '</text>';
  rows.forEach((o, i) => {
    const cx = L + band * i + band / 2; let acc = 0;
    CATS.forEach(c => { if (!o[c]) return; const y1 = y(acc + o[c]), y0 = y(acc); s += '<rect x="' + (cx - bw / 2) + '" y="' + y1 + '" width="' + bw + '" height="' + Math.max(y0 - y1, 1) + '" rx="3" style="fill:' + catColor(c) + ';stroke:var(--surface);stroke-width:2"/>'; acc += o[c]; });
    if (i === rows.length - 1 && o.t) s += '<text class="val" x="' + cx + '" y="' + (y(o.t) - 7) + '" text-anchor="middle">' + eurA(o.t) + '</text>';
    if (rows.length <= 8 || i % 2 === rows.length % 2) s += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(mLabel(o.k)) + '</text>';
    const tip = mLabel(o.k, true) + '\nTotal ' + eur(o.t) + CATS.filter(c => o[c]).map(c => '\n' + c + ': ' + eur(o[c])).join('');
    s += '<rect x="' + (L + band * i) + '" y="' + T + '" width="' + band + '" height="' + ih + '" fill="transparent" data-tip="' + esc(tip) + '"/>';
  });
  el.innerHTML = s + '<line class="axis" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0) + '" y2="' + y(0) + '"/></svg>';
}
function drawCompare(el, a, b) {
  if (!el) return;
  const rows = CATS.map(c => ({ c, a: totCat(a, c), b: b ? totCat(b, c) : 0 }));
  const mx = Math.max(0, ...rows.flatMap(r => [r.a, r.b]));
  if (!mx) { el.innerHTML = empty('Ninguno de los dos meses tiene gastos todavía.'); return; }
  const W = Math.max(el.clientWidth, 260), LB = 84, RB = 72, RH = b ? 50 : 34, H = rows.length * RH + 4, sc = (W - LB - RB) / mx;
  let s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Comparación por categoría">';
  rows.forEach((r, i) => {
    const t = i * RH + 2;
    s += '<text class="lab" x="0" y="' + (t + RH / 2 + 4) + '">' + r.c + '</text>';
    const ya = b ? t + 8 : t + 10;
    s += '<rect x="' + LB + '" y="' + ya + '" width="' + Math.max(r.a * sc, r.a ? 3 : 0) + '" height="12" rx="4" style="fill:var(--pa)"/><text x="' + (LB + r.a * sc + 7) + '" y="' + (ya + 10) + '">' + (r.a ? eurA(r.a) : '—') + '</text>';
    if (b) s += '<rect x="' + LB + '" y="' + (t + 25) + '" width="' + Math.max(r.b * sc, r.b ? 3 : 0) + '" height="12" rx="4" style="fill:var(--pb)"/><text x="' + (LB + r.b * sc + 7) + '" y="' + (t + 35) + '">' + (r.b ? eurA(r.b) : '—') + '</text>';
    const d = r.a - r.b;
    const tip = r.c + '\n' + mLabel(a) + ': ' + eur(r.a) + (b ? '\n' + mLabel(b) + ': ' + eur(r.b) + '\nDiferencia: ' + sgn(d) + eur(Math.abs(d)) : '');
    s += '<rect x="0" y="' + t + '" width="' + W + '" height="' + RH + '" fill="transparent" data-tip="' + esc(tip) + '"/>';
  });
  el.innerHTML = s + '</svg>';
}
// Evolución de la cartera: valor de cada día (línea) frente a lo aportado (escalones). La zona entre las dos es lo que se gana o se pierde.
function drawEvol(el, pts) {
  if (!el) return;
  if (pts.length < 2) { el.innerHTML = empty('La gráfica se verá en cuanto haya dos días con precio desde tu primera compra.'); return; }
  // En % se dibuja la rentabilidad de cada día (ganancia sobre lo aportado), alrededor del 0 %; en € el valor y lo aportado (escalones).
  const enPct = D.ajustes.vista !== 'eur', ref = el.dataset.ref || '', hayR = pts.some(p => p.r != null);
  const rp = (v, a) => (a > 0 ? ((v - a) / a) * 100 : 0), sV = p => (enPct ? rp(p.v, p.a) : p.v), sR = p => (p.r == null ? null : enPct ? rp(p.r, p.a) : p.r);
  const W = Math.max(el.clientWidth, 260), H = 230, L = 54, R = 74, T = 14, B = 28, iw = W - L - R, ih = H - T - B, n = pts.length, last = pts[n - 1];
  const vs = pts.flatMap(p => [sV(p), enPct ? 0 : p.a, sR(p)]).filter(v => v != null), mn = Math.min(...vs), mx = Math.max(...vs);
  const span = Math.max(mx - mn, enPct ? 0.5 : Math.max(mx * 0.01, 1)), step = niceStep(span / 3);
  const lo = enPct ? Math.floor((mn - span * 0.1) / step) * step : Math.max(0, Math.floor((mn - span * 0.1) / step) * step), top = Math.ceil((mx + span * 0.1) / step) * step;
  const x = i => L + (iw * i) / (n - 1), y = v => T + ih - ((v - lo) / (top - lo)) * ih;
  const fy = v => (enPct ? (v > 0.0001 ? '+' : v < -0.0001 ? '−' : '') + Math.abs(Math.round(v * 10) / 10).toLocaleString('es-ES') + ' %' : fmtAx(Math.round(v * 100) / 100));
  let s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" style="touch-action:pan-y" aria-label="' + (enPct ? 'Rentabilidad de la cartera' : 'Valor de la cartera frente a lo aportado') + '">';
  for (let v = lo; v <= top + 1e-9; v += step) s += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + fy(v) + '</text>';
  const pv = pts.map((p, i) => (i ? 'L' : 'M') + x(i) + ' ' + y(sV(p))).join(' ');
  const pa = pts.map((p, i) => (i ? 'H' + x(i) + ' V' + y(p.a) : 'M' + x(i) + ' ' + y(p.a))).join(' ');
  if (enPct) {   // verde por encima del 0 %, rojo por debajo
    const y0 = y(0), id = 'z' + uid(), area = pv + ' L' + x(n - 1) + ' ' + y0 + ' L' + x(0) + ' ' + y0 + ' Z';
    s += '<defs><clipPath id="' + id + 'a"><rect x="0" y="0" width="' + W + '" height="' + y0 + '"/></clipPath><clipPath id="' + id + 'b"><rect x="0" y="' + y0 + '" width="' + W + '" height="' + Math.max(H - y0, 0) + '"/></clipPath></defs>';
    s += '<path d="' + area + '" clip-path="url(#' + id + 'a)" style="fill:var(--good);opacity:.15;stroke:none"/><path d="' + area + '" clip-path="url(#' + id + 'b)" style="fill:var(--bad);opacity:.15;stroke:none"/>';
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y0 + '" y2="' + y0 + '" style="stroke:var(--ink2);stroke-width:1"/>';
  } else {
    let vuelta = ' L' + x(n - 1) + ' ' + y(last.a); for (let i = n - 1; i > 0; i--) vuelta += ' V' + y(pts[i - 1].a) + ' H' + x(i - 1);
    s += '<path d="' + pv + vuelta + ' Z" style="fill:var(--' + (last.v >= last.a ? 'good' : 'bad') + ');opacity:.13;stroke:none"/>';
  }
  if (hayR) s += '<path d="' + pts.map((p, i) => (p.r == null ? '' : (i && pts[i - 1].r != null ? 'L' : 'M') + x(i) + ' ' + y(sR(p)))).join(' ') + '" fill="none" style="stroke:var(--s3);stroke-width:2;stroke-linejoin:round"/>';
  s += '<path d="' + pv + '" fill="none" style="stroke:var(--s1);stroke-width:2.5;stroke-linejoin:round"/>';
  // Lo aportado, por encima: el día de cada compra coincide con el valor y, si fuera debajo, quedaría tapado.
  if (!enPct) s += '<path d="' + pa + '" fill="none" style="stroke:var(--s2);stroke-width:2;stroke-dasharray:6 4"/>';
  s += '<circle cx="' + x(n - 1) + '" cy="' + y(sV(last)) + '" r="4.5" style="fill:var(--s1);stroke:var(--surface);stroke-width:2"/>';
  [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i).forEach(i => { s += '<text x="' + Math.min(Math.max(x(i), L + 20), W - R) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(dLabel(pts[i].d)) + '</text>'; });
  const v2 = enPct ? sR(last) : last.a, t1 = enPct ? fy(sV(last)) : eur(Math.round(last.v), 0), t2 = v2 == null ? '' : enPct ? fy(v2) : eur(Math.round(v2), 0);
  let y1 = y(sV(last)) + 4, y2 = v2 == null ? 0 : y(v2) + 4;
  if (v2 != null && Math.abs(y1 - y2) < 15) { if (y1 <= y2) { y1 -= 8; y2 += 8; } else { y1 += 8; y2 -= 8; } }
  s += '<text class="val" x="' + (x(n - 1) + 11) + '" y="' + y1 + '">' + t1 + '</text>' + (v2 != null ? '<text x="' + (x(n - 1) + 11) + '" y="' + y2 + '">' + t2 + '</text>' : '');
  s += '<line class="cursor" x1="0" x2="0" y1="' + T + '" y2="' + (T + ih) + '" style="display:none"/>';
  el.innerHTML = s + '</svg><div class="gtip" hidden></div>';
  // Al tocar o arrastrar: el detalle del día más cercano.
  const svg = el.querySelector('svg'), box = el.querySelector('.gtip'), cur = el.querySelector('.cursor');
  const mostrar = ev => {
    const r = svg.getBoundingClientRect(), i = Math.max(0, Math.min(n - 1, Math.round((((ev.clientX - r.left) * (W / r.width) - L) / iw) * (n - 1)))), p = pts[i];
    cur.setAttribute('x1', x(i)); cur.setAttribute('x2', x(i)); cur.style.display = '';
    const g = p.v - p.a, gp = rp(p.v, p.a);
    let h = '<b>' + esc(dLabel(p.d)) + '</b><br>' + (hayR ? 'Tu cartera' : 'Valor') + ': ' + eur(p.v) + ' (' + pct(gp) + ')';
    if (p.r != null) { const rr = rp(p.r, p.a), dif = p.v - p.r; h += '<br>' + esc(ref) + ': ' + eur(p.r) + ' (' + pct(rr) + ')<br>Diferencia: ' + (dif >= 0 ? '+' : '−') + eur(Math.abs(dif)) + ' · ' + (gp - rr >= 0 ? '+' : '−') + Math.abs(Math.round((gp - rr) * 10) / 10).toLocaleString('es-ES') + ' puntos'; }
    else h += '<br>Aportado: ' + eur(p.a) + '<br>' + (g >= 0 ? 'Ganancia: +' : 'Pérdida: −') + eur(Math.abs(g));
    box.innerHTML = h; box.hidden = false;
    const bw = box.offsetWidth, cx = x(i) * (r.width / W);
    box.style.left = Math.max(0, Math.min(cx - bw / 2, r.width - bw)) + 'px';
  };
  svg.addEventListener('pointerdown', mostrar);
  svg.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons) mostrar(e); });
  svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { box.hidden = true; cur.style.display = 'none'; } });
}

const shortEur = v => (v >= 1e6 ? (v / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' M €' : eur(Math.round(v), 0));
function drawProj(el, rows) {
  if (!el) return;
  const W = Math.max(el.clientWidth, 260), H = 240, L = 56, R = 72, T = 16, B = 28, iw = W - L - R, ih = H - T - B, n = rows.length;
  const mx = Math.max(...rows.flatMap(r => [r.valor, r.aport]), 1), step = niceStep(mx / 4), top = Math.ceil(mx / step) * step;
  const x = i => (n === 1 ? L + iw / 2 : L + (iw * i) / (n - 1)), y = v => T + ih - (Math.max(v, 0) / top) * ih;
  let s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Cómo crecería el dinero año a año">';
  for (let v = 0; v <= top + 1e-9; v += step) s += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + fmtAx(Math.round(v * 100) / 100) + '</text>';
  const path = f => rows.map((r, i) => (i ? 'L' : 'M') + x(i) + ' ' + y(r[f])).join(' ');
  s += '<path d="' + path('aport') + '" fill="none" style="stroke:var(--s2);stroke-width:2.5;stroke-linejoin:round"/><path d="' + path('valor') + '" fill="none" style="stroke:var(--s1);stroke-width:2.5;stroke-linejoin:round"/>';
  const total = rows[n - 1].y, stepY = [1, 2, 5, 10, 20, 50].find(k => total / k <= 5) || 50;
  rows.forEach((r, i) => {
    if (n <= 12) s += '<circle cx="' + x(i) + '" cy="' + y(r.aport) + '" r="3.5" style="fill:var(--s2);stroke:var(--surface);stroke-width:2"/><circle cx="' + x(i) + '" cy="' + y(r.valor) + '" r="3.5" style="fill:var(--s1);stroke:var(--surface);stroke-width:2"/>';
    if ((Number.isInteger(r.y) && r.y % stepY === 0) || (i === n - 1 && !Number.isInteger(r.y))) s += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + (i === 0 ? 'Hoy' : r.y.toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' a.') + '</text>';
    const gan = r.valor - r.aport;
    const tip = (i === 0 ? 'Hoy' : 'Dentro de ' + r.y.toLocaleString('es-ES', { maximumFractionDigits: 1 }) + (r.y === 1 ? ' año' : ' años')) + '\nTendrías: ' + eur(r.valor, 0) + '\nHabrías aportado: ' + eur(r.aport, 0) + '\nGanancia: ' + sgn(gan) + eur(Math.abs(gan), 0);
    s += '<rect x="' + (x(i) - iw / Math.max(n - 1, 1) / 2) + '" y="' + T + '" width="' + iw / Math.max(n - 1, 1) + '" height="' + ih + '" fill="transparent" data-tip="' + esc(tip) + '"/>';
  });
  const last = rows[n - 1]; let y1 = y(last.valor) + 4, y2 = y(last.aport) + 4;
  if (Math.abs(y1 - y2) < 15) { if (y1 <= y2) { y1 -= 8; y2 += 8; } else { y1 += 8; y2 -= 8; } }
  s += '<text class="val" x="' + (x(n - 1) + 11) + '" y="' + y1 + '">' + shortEur(last.valor) + '</text><text x="' + (x(n - 1) + 11) + '" y="' + y2 + '">' + shortEur(last.aport) + '</text>';
  el.innerHTML = s + '<line class="axis" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0) + '" y2="' + y(0) + '"/></svg>';
}

/* ---------- 5. pantallas ---------- */
const ui = { gMes: null, q: '', segTipo: 'accion', cmpA: null, cmpB: null, cart: 'total', eRango: 'todo', kRango: 'todo', fPer: '1a', fichaQ: '', sim: null, escTipo: 'inv', inm: null };
// Escenarios de inmueble: tiene muchos campos, así que se recuerda lo último que pusiste (aparte de tus datos y copias).
const INM0 = { precio: '150000', impCompra: '4', otros: '2500', reforma: '0', ltv: '80', tipo: '3', plazo: '25', alquiler: '800', vacio: '1', gestion: '0', subida: '2', comunidad: '40', ibi: '300', seguro: '150', mant: '400', anios: '15', revalor: '2', gastosVenta: '4', impAlq: '20', impGan: '19', alt: '7' };
try {
  const sv = JSON.parse(localStorage.getItem('centex.esc') || 'null');
  if (sv && typeof sv === 'object') {
    if (sv.tipo === 'inm' || sv.tipo === 'cmp') ui.escTipo = sv.tipo;
    if (sv.inm && typeof sv.inm === 'object') { ui.inm = Object.assign({}, INM0); Object.keys(INM0).forEach(k => { if (typeof sv.inm[k] === 'string') ui.inm[k] = sv.inm[k].slice(0, 20); }); }
  }
} catch (e) { /* sin datos guardados */ }
const persistEsc = () => { try { localStorage.setItem('centex.esc', JSON.stringify({ tipo: ui.escTipo, inm: ui.inm })); } catch (e) { /* no pasa nada */ } };
const ROUTES = ['inicio', 'gastos', 'cartera', 'seguimiento', 'objetivos', 'escenarios', 'ajustes'];
const NAV = [['inicio', 'Inicio', 'home'], ['gastos', 'Gastos', 'receipt'], ['cartera', 'Cartera', 'pie'], ['seguimiento', 'Seguimiento', 'trend'], ['objetivos', 'Objetivos', 'target'], ['escenarios', 'Escenarios', 'wave']];
const FAB = { inicio: ['Apuntar', 'rapido'], gastos: ['Nuevo gasto', 'addGasto'], cartera: ['Añadir compra', 'addCompra'], seguimiento: ['Añadir', 'addSeg'], objetivos: ['Nuevo objetivo', 'addObj'] };
const fabOf = r => FAB[r];
const route = () => { const r = (location.hash || '').replace(/^#\/?/, ''); return ROUTES.includes(r) ? r : 'inicio'; };

const vh = (t, sub, r) => '<div class="vh"><div><h1>' + t + '</h1>' + (sub ? '<p class="sub">' + sub + '</p>' : '') + '</div>' + (fabOf(r) ? '<button class="btn" data-act="' + fabOf(r)[1] + '">' + icon('plus') + fabOf(r)[0] + '</button>' : '') + '</div>';
const deltaPill = (v, p) => v == null ? '' : '<span class="pill ' + (v > 0 ? 'good' : v < 0 ? 'bad' : 'flat') + '">' + (v > 0 ? '▲' : v < 0 ? '▼' : '') + ' ' + sgn(v) + eur(Math.abs(v)) + (p != null ? ' · ' + pct(p) : '') + '</span>';

// Datos de ejemplo del modo de prueba: gastos de las últimas semanas (con fechas de hoy hacia atrás), una cartera con aportación
// periódica desde marzo de 2026 (la app apunta sola las compras que faltan), acciones en seguimiento con su precio real de entrada y objetivos.
function demoData() {
  const hoy = new Date(), dia = n => new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - n), g = [];
  const add = (n, desc, cat, cant, pago) => g.push({ id: 'dg' + g.length, fecha: dia(n).toLocaleDateString('sv-SE'), desc, cat, cant: Math.round(cant * 100) / 100, pago: pago || 'Tarjeta' });
  for (let n = 0; n < 62; n++) {
    const dw = dia(n).getDay();
    if (dw >= 1 && dw <= 5) { if (n % 3 !== 1) add(n, 'Café', 'Comida', 1.5, n % 2 ? 'Efectivo' : 'Tarjeta'); add(n, 'Bus', 'Transporte', 1.3); if (n % 4 === 0) add(n, 'Menú del día', 'Comida', 12.5); }
    if (dw === 6) { add(n, 'Mercadona', 'Comida', 38 + (n % 5) * 4.3); add(n, n % 14 < 7 ? 'Cine' : 'Cena con amigos', 'Ocio', n % 14 < 7 ? 9 : 24); }
    if (n === 3 || n === 33) add(n, 'Gimnasio', 'Otros', 34.9);
    if (n === 9) add(n, 'Zapatillas', 'Compras', 69.99);
    if (n === 40) add(n, 'Regalo de cumpleaños', 'Compras', 25);
  }
  const s = (id, grupo, nombre, ticker, ent, motivo) => ({ id, tipo: 'accion', grupo, nombre, ticker, fecha: '2026-03-02', precioEntrada: ent, precioActual: null, motivo, web: '' });
  return {
    gastos: g, habOff: [], habMan: [], cartera: [], carteras: [{ id: 'principal', nombre: 'Mi bróker' }],
    fondos: [
      { id: 'f_dw', isin: 'IE000ZYRH0Q7', nombre: 'iShares Developed World Index', c: 'principal', compras: [{ id: 'dc1', f: '2026-03-03', imp: 2000, part: null, est: 'part' }], plan: { imp: 150, dia: 5, desde: '2026-04-01', hasta: null, saltar: [] } },
      { id: 'f_em', isin: 'IE0031786696', nombre: 'Vanguard Emerging Markets', c: 'principal', compras: [{ id: 'dc2', f: '2026-03-02', imp: 500, part: null, est: 'part' }], plan: { imp: 50, dia: 5, desde: '2026-04-01', hasta: null, saltar: [] } }],
    seg: [s('ds1', 'Tecnología', 'Apple', 'NASDAQ:AAPL', 264.72, 'Ecosistema y servicios con márgenes altos'), s('ds2', 'Tecnología', 'NVIDIA', 'NASDAQ:NVDA', 182.48, 'Chips para inteligencia artificial'),
      s('ds3', 'Consumo', 'Inditex', 'BME:ITX', 54.06, 'Marca fuerte y sin deuda'), s('ds4', 'Banca', 'Banco Santander', 'BME:SAN', 10.268, 'Negocio repartido por muchos países')],
    secciones: SECS0(), objetivos: [{ id: 'do1', nombre: 'Viaje a Japón', meta: 2500, ahorrado: 900, fecha: addM(mk(todayISO()), 8) + '-28' }, { id: 'do2', nombre: 'Colchón para imprevistos', meta: 3000, ahorrado: 1850, fecha: null }],
    ajustes: { tema: 'auto', ultimaCopia: todayISO(), logos: true, cmp: 'EUNL.DE', refs: [] }
  };
}
const demoBanner = () => '<div class="banner" style="background:var(--s1);color:#fff"><span><b>Modo de prueba:</b> son datos de ejemplo. Lo que cambies aquí no toca tus datos.</span><button class="btn sm" style="background:#fff;color:#111" data-act="demoOut">Salir</button></div>';
function vInicio() {
  const has = D.gastos.length || D.fondos.length || D.seg.length || D.objetivos.length;
  const hoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  if (!has) {
    return { html: '<div class="page">' + vh('Bienvenido', hoy, 'inicio') +
      '<div class="card welcome"><h2>Tu dinero, en un solo sitio</h2><p>Centex es una app gratuita para ordenar tus finanzas: apunta tus gastos, sigue tus fondos y acciones con precios que se actualizan solos y mira si lo estás haciendo mejor o peor que el mercado.</p>' +
      '<ul class="steps"><li><b>Tus datos se quedan en este móvil.</b> Sin cuentas ni registros: nadie más los ve.</li><li><b>Gastos:</b> en qué se te va el dinero cada mes, y lo que repites, con un toque.</li><li><b>Cartera:</b> cuánto valen hoy tus fondos y cuánto ganas.</li><li><b>Escenarios:</b> cuánto podría crecer tu dinero y cómo vas frente al MSCI World.</li></ul>' +
      '<div class="btn-row" style="margin-top:14px"><button class="btn" data-act="demoIn">Probar con datos de ejemplo</button><button class="btn ghost" data-act="addGasto">' + icon('plus') + 'Empezar con mis datos</button></div>' +
      '<p class="sub" style="margin:12px 0 0">¿Ya usabas Centex? <button class="link" data-act="pickFile">Importa tu copia de seguridad</button>.</p></div></div>' };
  }
  const cur = mk(todayISO()), prev = addM(cur, -1), day = +todayISO().slice(8, 10);
  const t = totMonth(cur), nCur = D.gastos.filter(x => mk(x.fecha) === cur).length;
  const pHas = D.gastos.some(x => mk(x.fecha) === prev);
  const pTo = D.gastos.filter(x => mk(x.fecha) === prev && +x.fecha.slice(8, 10) <= day).reduce((s, x) => s + x.cant, 0);
  let dl;
  if (!nCur && !pHas) dl = 'Aún no hay gastos apuntados este mes.';
  else if (!pHas) dl = 'Sin datos del mes pasado para comparar.';
  else { const df = t - pTo; dl = df === 0 ? 'Igual que en los mismos días de ' + monthName(prev) : '<span class="' + (df > 0 ? 'up' : 'dn') + '">' + (df > 0 ? '▲ ' : '▼ ') + eur(Math.abs(df)) + (df > 0 ? ' más' : ' menos') + '</span> que en los mismos días de ' + monthName(prev); }
  const topC = CATS.map(c => [c, totCat(cur, c)]).sort((a, b) => b[1] - a[1])[0];
  const hero = '<div class="hero"><div class="l">Gastado en ' + monthName(cur) + '</div><div class="big">' + eur(t) + '</div><div class="d">' + dl + '</div>' +
    '<div class="mini"><div><b>' + eur(day ? t / day : 0) + '</b><span>media diaria</span></div><div><b>' + nCur + '</b><span>gasto' + (nCur === 1 ? '' : 's') + '</span></div><div><b>' + (topC && topC[1] > 0 ? topC[0] : '—') + '</b><span>categoría top</span></div></div></div>';

  const TC = totalFondos(D.fondos);
  const cartCard = '<div class="card stat"><div class="card-head"><div class="l">Cartera real</div><a class="link" href="#/cartera">Ver</a></div>' + (TC.n ?
    '<div class="v">' + eur(TC.val) + '</div>' + deltaPill(red2(TC.gan), TC.pct) + '<div class="d">sobre ' + eur(TC.ap) + ' aportados' + (TC.ult ? ' · precios del ' + esc(dLabel(TC.ult)) : '') + '</div>' :
    '<div class="v">—</div><div class="d">Añade tus fondos y sus compras en Cartera.</div>') + '</div>';

  const gl = D.objetivos.slice(0, 2);
  const goalCard = '<div class="card"><div class="card-head"><h2>Objetivos</h2><a class="link" href="#/objetivos">Ver</a></div>' + (gl.length ? gl.map(o => {
    const p = Math.min(100, (o.ahorrado / o.meta) * 100);
    return '<div class="minigoal"><div class="h"><b>' + esc(o.nombre) + '</b><span>' + Math.round(p) + ' %</span></div><div class="bar"><i style="width:' + p + '%"></i></div></div>';
  }).join('') : '<p class="sub" style="margin:0">Crea tu primer objetivo de ahorro, por ejemplo el colchón de emergencia.</p>') + '</div>';

  const rs = D.seg.map(rentPos).filter(r => r != null), avg = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null;
  const segCard = '<div class="card stat"><div class="card-head"><div class="l">Seguimiento sin dinero real</div><a class="link" href="#/seguimiento">Ver</a></div><div class="v">' + D.seg.length + ' posiciones</div>' +
    (avg != null ? '<span class="pill ' + (avg >= 0 ? 'good' : 'bad') + '">' + (avg >= 0 ? '▲' : '▼') + ' ' + pct(avg) + ' de media</span>' : '<div class="d" style="margin-top:0">Pon el precio actual para ver la rentabilidad.</div>') + '</div>';

  const months = monthRange(), opts = months.slice().reverse();
  if (!ui.cmpA || !months.includes(ui.cmpA)) ui.cmpA = months.includes(cur) ? cur : months[months.length - 1];
  if (ui.cmpB === undefined || (ui.cmpB && (!months.includes(ui.cmpB) || ui.cmpB === ui.cmpA))) ui.cmpB = null;
  if (ui.cmpB === null && !ui._cmpTouched) ui.cmpB = months.includes(addM(ui.cmpA, -1)) ? addM(ui.cmpA, -1) : null;
  const so = sel => opts.map(k => '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + esc(mLabel(k)) + '</option>').join('');
  const ta = totMonth(ui.cmpA), tb = ui.cmpB ? totMonth(ui.cmpB) : 0;
  const cmpSum = ui.cmpB ? '<b>' + esc(mLabel(ui.cmpA)) + '</b> ' + eur(ta) + ' &nbsp;·&nbsp; <b>' + esc(mLabel(ui.cmpB)) + '</b> ' + eur(tb) + ' &nbsp;·&nbsp; <span class="' + (ta > tb ? 'up-t' : ta < tb ? 'dn-t' : '') + '">' + (ta > tb ? '▲ ' : ta < tb ? '▼ ' : '') + sgn(ta - tb) + eur(Math.abs(ta - tb)) + (tb > 0 ? ' (' + pct(((ta - tb) / tb) * 100) + ')' : '') + '</span>' : '<b>' + esc(mLabel(ui.cmpA, true)) + '</b> ' + eur(ta);
  const bkp = bkpBanner();

  const html = '<div class="page">' + vh('Inicio', hoy, 'inicio') + hero + bkp +
    '<div class="grid2">' + cartCard + goalCard + '</div>' +
    '<div class="card"><div class="card-head"><h2>Gasto por mes</h2></div><div class="legend">' + CATS.map(c => '<span><i style="background:' + catColor(c) + '"></i>' + c + '</span>').join('') + '</div><div class="chart" id="chMeses"></div></div>' +
    '<div class="card"><h2>Comparar dos meses</h2><p class="sub">Mira en qué categorías gastaste más o menos.</p>' +
    '<div class="row2" style="margin-bottom:12px"><div class="fld"><label for="cmpA">Mes A</label><select id="cmpA">' + so(ui.cmpA) + '</select></div><div class="fld"><label for="cmpB">Mes B</label><select id="cmpB"><option value="">Ninguno</option>' + so(ui.cmpB) + '</select></div></div>' +
    '<p style="font-size:14px;margin-bottom:10px">' + cmpSum + '</p><div class="legend"><span><i style="background:var(--pa)"></i>' + esc(mLabel(ui.cmpA)) + '</span>' + (ui.cmpB ? '<span><i style="background:var(--pb)"></i>' + esc(mLabel(ui.cmpB)) + '</span>' : '') + '</div><div class="chart" id="chCmp"></div></div>' +
    segCard + '</div>';
  return { html, after() { drawStack($('#chMeses'), months); drawCompare($('#chCmp'), ui.cmpA, ui.cmpB); } };
}

// Aviso de copia de seguridad: con algo apuntado y sin copia en las últimas dos semanas (en el modo de prueba, nunca).
function backupDue() {
  const n = D.gastos.length + D.fondos.reduce((a, fo) => a + fo.compras.length, 0) + D.seg.length + D.objetivos.length;
  if (DEMO || n < 5) return false;
  const u = D.ajustes.ultimaCopia;
  if (!u) return true;
  return (new Date(todayISO()) - new Date(u)) / 864e5 > 14;
}
const bkpBanner = () => (backupDue() ? '<div class="banner"><span>' + (D.ajustes.ultimaCopia ? 'Hace más de dos semanas que no haces copia de seguridad. Tus datos solo están en este móvil.' : 'Aún no has hecho ninguna copia de seguridad. Tus datos solo están en este móvil: si lo pierdes o borras el navegador, se pierden.') + '</span><button class="btn sm ghost" data-act="export">Hacer copia</button></div>' : '');

function gastoRowHTML(x) {
  const c = catColor(x.cat);
  return '<button class="item" data-act="editGasto" data-id="' + esc(x.id) + '"><span class="badge" style="background:color-mix(in srgb,' + c + ' 18%,var(--surface))">' + catIcon(x.cat) + '</span>' +
    '<span class="t"><b>' + esc(x.desc || x.cat) + '</b><small>' + esc(x.cat) + ' · ' + esc(x.pago) + '</small></span><span class="r">' + eur(x.cant) + '</span></button>';
}
function gListHTML() {
  let list = D.gastos.filter(x => ui.gMes === 'todos' || mk(x.fecha) === ui.gMes);
  const q = ui.q.trim().toLowerCase();
  if (q) list = list.filter(x => (x.desc + ' ' + x.cat).toLowerCase().includes(q));
  list.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  const tot = list.reduce((s, x) => s + x.cant, 0);
  let summary = '';
  if (list.length) {
    const by = CATS.map(c => [c, list.filter(x => x.cat === c).reduce((s, x) => s + x.cant, 0)]).filter(a => a[1] > 0).sort((a, b) => b[1] - a[1]);
    summary = '<div class="card"><div class="total-line"><b>' + eur(tot) + '</b><span>' + list.length + ' gasto' + (list.length > 1 ? 's' : '') + '</span></div>' +
      '<div class="splitbar" aria-hidden="true">' + by.map(a => '<span style="width:' + (a[1] / tot) * 100 + '%;background:' + catColor(a[0]) + '"></span>').join('') + '</div>' +
      '<div class="splitleg">' + by.map(a => '<div><span>' + catIcon(a[0], true) + a[0] + '</span><span class="num">' + eur(a[1]) + ' <em>' + Math.round((a[1] / tot) * 100) + '%</em></span></div>').join('') + '</div></div>';
  }
  let body;
  if (!list.length) body = empty(D.gastos.length ? 'No hay gastos con ese filtro. Prueba otro mes o borra la búsqueda.' : 'Aún no hay gastos. Toca + para apuntar el primero.');
  else {
    const days = [...new Set(list.map(x => x.fecha))];
    body = '<div class="card"><div class="list">' + days.map(d => {
      const items = list.filter(x => x.fecha === d), dt = items.reduce((s, x) => s + x.cant, 0);
      return '<div class="day"><span>' + esc(dayHead(d)) + '</span><span class="num">' + eur(dt) + '</span></div>' + items.map(gastoRowHTML).join('');
    }).join('') + '</div></div>';
  }
  return summary + body;
}
const gBadge = cat => '<span class="badge" style="background:color-mix(in srgb,' + catColor(cat) + ' 18%,var(--surface))">' + catIcon(cat) + '</span>';
function habCard() {
  const hs = habituales(), m = ui.gMes;
  const per = m === 'todos' ? 'en total' : m === mk(todayISO()) ? 'este mes' : 'en ' + monthName(m);
  hs.forEach(h => { const ms = h.xs.filter(x => m === 'todos' || mk(x.fecha) === m); h.n = ms.length; h.tot = ms.reduce((a, x) => a + x.cant, 0); });
  hs.sort((a, b) => b.n - a.n || ((a.ult || '') < (b.ult || '') ? 1 : (a.ult || '') > (b.ult || '') ? -1 : 0));
  const row = h => '<div class="item hab">' + gBadge(h.cat) + '<button class="t habt" data-act="habVer" data-k="' + esc(h.k) + '"><b>' + esc(h.desc) + '</b><small>' + esc(h.cat) + ' · ' + eur(h.cant) + ' · ' + (h.n ? h.n + (h.n > 1 ? ' veces ' : ' vez ') + per + ': ' + eur(h.tot) : 'ninguna vez ' + per) + '</small></button>' +
    '<button class="btn sm ghost habadd" data-act="habAdd" data-k="' + esc(h.k) + '" aria-label="Apuntar ' + esc(h.desc) + ' hoy">' + icon('plus') + '</button></div>';
  const top = hs.slice(0, 5), rest = hs.slice(5);
  return '<div class="card"><div class="card-head" style="align-items:center"><h2>Gastos habituales</h2><button class="icon-btn" data-act="habEdit" aria-label="Editar gastos habituales">' + icon('dots') + '</button></div>' +
    (hs.length ? '<p class="sub" style="margin:0 0 4px">Lo que repites (2 veces en 30 días) y lo que añadas tú. Toca + para apuntarlo hoy.</p><div class="list">' + top.map(row).join('') + '</div>' +
      (rest.length ? '<details class="habmas"><summary>Ver ' + rest.length + ' más</summary><div class="list">' + rest.map(row).join('') + '</div></details>' : '')
      : '<p class="sub" style="margin:0">Aquí salen los gastos que repites, como el café o el bus: cuando apuntes uno con la misma descripción 2 veces en 30 días. También puedes añadirlos tú con ⋯.</p>') + '</div>';
}
function sheetHab(k) {
  const h = habituales().find(x => x.k === k); if (!h) { closeSheet(); return; }
  const m = mk(todayISO()), ms = h.xs.filter(x => mk(x.fecha) === m), media = h.xs.length ? h.xs.reduce((a, x) => a + x.cant, 0) / h.xs.length : null;
  openSheet(h.desc,
    '<div class="form"><div class="item plain" style="border:0;padding:0;grid-template-columns:auto 1fr">' + gBadge(h.cat) + '<span class="t"><b>' + esc(h.desc) + '</b><small>' + esc(h.cat) + ' · ' + esc(h.pago) + ' · ' + eur(h.cant) + (h.man ? ' · añadido por ti' : '') + '</small></span></div>' +
    '<p class="sub" style="margin:0">' + (h.xs.length ? 'Lo has apuntado <b>' + h.xs.length + (h.xs.length > 1 ? ' veces' : ' vez') + '</b>; la última, el ' + esc(dLabel(h.ult)) + '. De media, ' + eur(media) + '.<br>Este mes: ' + (ms.length ? ms.length + (ms.length > 1 ? ' veces, ' : ' vez, ') + eur(ms.reduce((a, x) => a + x.cant, 0)) : 'ninguna vez') + '.' : 'Todavía no lo has apuntado ninguna vez.') + '</p>' +
    '<div class="sheet-actions"><button type="button" class="btn danger" data-act="habOff" data-k="' + esc(k) + '">Quitar de habituales</button><button type="button" class="btn" data-act="habAdd" data-k="' + esc(k) + '">' + icon('plus') + 'Apuntar hoy</button></div>' +
    (h.man ? '<button type="button" class="btn sm ghost" style="align-self:flex-start" data-act="habForm" data-id="' + esc(h.man) + '">Cambiar nombre o precio</button>' : '') + '</div>');
}
// Editar la lista: añadir a mano, quitar y recuperar quitados.
function sheetHabEdit() {
  const hs = habituales().sort((a, b) => a.desc.localeCompare(b.desc, 'es'));
  const nom = k => { const mm = D.habMan.find(x => habKey(x) === k); if (mm) return mm.desc; const xs = D.gastos.filter(x => habKey(x) === k); return xs.length ? xs[xs.length - 1].desc : k.split('|')[0]; };
  openSheet('Editar gastos habituales',
    '<div class="form"><button type="button" class="btn" style="align-self:flex-start" data-act="habForm">' + icon('plus') + 'Añadir uno</button>' +
    '<div class="fld"><span class="lb">En la lista</span>' + (hs.length ? '<div class="list">' + hs.map(h => '<div class="item plain"><span class="t"><b>' + esc(h.desc) + '</b><small>' + esc(h.cat) + ' · ' + eur(h.cant) + ' · ' + (h.man ? 'añadido por ti' : 'detectado') + '</small></span><span class="btn-row" style="flex-wrap:nowrap">' +
      (h.man ? '<button type="button" class="btn sm ghost" data-act="habForm" data-id="' + esc(h.man) + '">Editar</button>' : '') + '<button type="button" class="btn sm ghost" data-act="habOff" data-k="' + esc(h.k) + '" data-back="1">Quitar</button></span></div>').join('') + '</div>' : '<span class="help">Ahora mismo no hay ninguno.</span>') + '</div>' +
    (D.habOff.length ? '<div class="fld"><span class="lb">Quitados</span><span class="help">No salen aunque los repitas.</span><div class="list">' + D.habOff.map(k => '<div class="item plain"><span class="t"><b>' + esc(nom(k)) + '</b><small>' + esc(k.split('|')[1] || '') + '</small></span><button type="button" class="btn sm ghost" data-act="habOn" data-k="' + esc(k) + '">Volver a añadir</button></div>').join('') + '</div></div>' : '') + '</div>');
}
function sheetHabForm(id) {
  const m = id ? D.habMan.find(x => x.id === id) : null, v = m || { desc: '', cat: 'Comida', cant: '', pago: 'Tarjeta' };
  openSheet(m ? 'Editar gasto habitual' : 'Añadir gasto habitual',
    '<div class="form"><div class="fld"><label for="hDesc">Descripción</label><input id="hDesc" name="desc" maxlength="80" autocomplete="off" placeholder="Café, bus, menú…" value="' + esc(v.desc) + '"></div>' +
    '<div class="fld"><span class="lb">Categoría</span><div class="opts" role="radiogroup" aria-label="Categoría">' + CATS.map(c => opt('cat', c, v.cat === c, catIcon(c, true) + c)).join('') + '</div></div>' +
    '<div class="row2"><div class="fld"><label for="hCant">Precio habitual (€)</label><input id="hCant" name="cant" inputmode="decimal" autocomplete="off" placeholder="0,00" value="' + fmtIn(v.cant) + '"></div><div class="fld"><span class="lb">Pago</span><div class="opts" role="radiogroup" aria-label="Forma de pago">' + ['Tarjeta', 'Efectivo'].map(p => opt('pago', p, v.pago === p, p)).join('') + '</div></div></div>' +
    '<span class="help">Cuando lo apuntes, se rellenará con estos datos; si un día cuesta otra cosa, lo cambias en ese momento.</span>' +
    actions(m ? delBtn('hab', m.id) : '', m ? 'Guardar' : 'Añadir') + '</div>',
    fd => {
      const desc = String(fd.get('desc') || '').trim().slice(0, 80), cant = num(fd.get('cant')), cat = CATS.includes(fd.get('cat')) ? fd.get('cat') : 'Otros';
      if (!desc) return 'Pon una descripción.';
      if (!(cant > 0)) return 'Pon un precio mayor que 0.';
      const o = { id: m ? m.id : uid(), desc, cat, cant: Math.round(cant * 100) / 100, pago: fd.get('pago') === 'Efectivo' ? 'Efectivo' : 'Tarjeta' }, k = habKey(o);
      if (D.habMan.some(x => x !== m && habKey(x) === k)) return 'Ya tienes «' + desc + '» en la lista.';
      if (m) D.habMan[D.habMan.indexOf(m)] = o; else D.habMan.push(o);
      D.habOff = D.habOff.filter(x => x !== k);
      save(); render(); toast(m ? 'Gasto habitual actualizado' : 'Añadido a habituales');
    });
  setTimeout(() => { const i = $('#hDesc'); if (i && !m) i.focus(); }, 60);
}
function vGastos() {
  const cur = mk(todayISO());
  const months = [...new Set(D.gastos.map(x => mk(x.fecha)))]; if (!months.includes(cur)) months.push(cur);
  months.sort().reverse();
  if (!ui.gMes || (ui.gMes !== 'todos' && !months.includes(ui.gMes))) ui.gMes = cur;
  const chips = '<div class="chips" role="group" aria-label="Mes">' + [['todos', 'Todos']].concat(months.map(k => [k, mLabel(k)])).map(c => '<button class="chip" data-act="gMes" data-m="' + c[0] + '" aria-pressed="' + (ui.gMes === c[0]) + '">' + esc(c[1]) + '</button>').join('') + '</div>';
  const html = '<div class="page">' + vh('Gastos', 'Lo que gastas, mes a mes', 'gastos') + bkpBanner() + chips +
    habCard() +
    '<div class="search">' + icon('search') + '<input id="q" type="search" placeholder="Buscar por descripción o categoría" value="' + esc(ui.q) + '" aria-label="Buscar gastos" autocomplete="off"></div>' +
    '<div id="gList" style="display:flex;flex-direction:column;gap:14px">' + gListHTML() + '</div>' +
    '<details class="card"><summary>Total entre dos fechas</summary><div class="body"><div class="row2"><div class="fld"><label for="rDesde">Desde</label><input id="rDesde" type="date"></div><div class="fld"><label for="rHasta">Hasta</label><input id="rHasta" type="date"></div></div><p id="rTotal" style="font-size:14px;color:var(--ink2)">Elige las dos fechas.</p></div></details></div>';
  return { html };
}

const E_RANGOS = [['1m', '1 mes', 1], ['6m', '6 meses', 6], ['1a', '1 año', 12], ['todo', 'Todo', 0]];
// Tarjeta de evolución: valor de cada día frente a lo aportado, con periodo a elegir (key: dónde se guarda el periodo).
// Con cmp, también lo que valdría lo mismo invertido en ese índice y el resumen de la comparación.
function evolBloque(fl, cmp, key, chartId) {
  const all = serieCartera(fl, cmp), span = all.length > 1 ? (Date.parse(all[all.length - 1].d) - Date.parse(all[0].d)) / 864e5 : 0;
  const rangos = E_RANGOS.filter(r => !r[2] || span > r[2] * 30.4);
  if (!rangos.some(r => r[0] === ui[key])) ui[key] = 'todo';
  const rg = E_RANGOS.find(r => r[0] === ui[key]), cut = rg[2] ? addM(mk(todayISO()), -rg[2]) + todayISO().slice(7) : '';
  const serie = cut ? all.filter(p => p.d >= cut) : all, a = serie[0], b = serie[serie.length - 1];
  let per = '', cmpTxt = '';
  if (cut && serie.length > 1) per = '<p class="sub" style="margin:8px 2px 0">En este periodo: ' + gTxt((b.v - a.v) - (b.a - a.a)) + ', sin contar lo que aportaste.</p>';
  if (cmp) {
    if (!b || b.r == null || (cut && a.r == null)) cmpTxt = '<p class="sub" style="margin:8px 2px 0">' + refEstado(cmp) + '</p>';
    else {
      const gm = cut ? (b.v - a.v) - (b.a - a.a) : b.v - b.a, gr = cut ? (b.r - a.r) - (b.a - a.a) : b.r - b.a, dif = gm - gr, n = esc(refNombre(cmp));
      cmpTxt = '<p class="sub" style="margin:8px 2px 0">' + (cut ? 'En este periodo, con ' + n + ' habrías ganado ' + gTxt(gr) : 'Con ' + n + ' tendrías <b class="num">' + eur(b.r) + '</b> (' + gTxt(gr) + ')') + '. ' +
        (Math.abs(dif) < 0.005 ? 'Vas igual.' : 'Vas <b>' + eur(Math.abs(dif)) + (dif > 0 ? ' por delante' : ' por detrás') + '</b> de ' + n + '.') + '</p>';
    }
  }
  const enPct = D.ajustes.vista !== 'eur';
  return { serie, html: '<div class="card"><div class="card-head" style="align-items:center"><h2>' + (cmp ? 'Tu cartera frente a ' + esc(refNombre(cmp)) : 'Evolución') + '</h2>' +
    '<div class="seg" role="group" aria-label="Ver en"><button data-act="gVista" data-v="pct" aria-pressed="' + enPct + '">%</button><button data-act="gVista" data-v="eur" aria-pressed="' + !enPct + '">€</button></div></div>' +
    (rangos.length > 1 ? '<div class="chips" role="group" aria-label="Periodo" style="margin-bottom:10px">' + rangos.map(r => '<button class="chip" style="text-transform:none" data-act="eRango" data-k="' + key + '" data-r="' + r[0] + '" aria-pressed="' + (ui[key] === r[0]) + '">' + r[1] + '</button>').join('') + '</div>' : '') +
    '<div class="legend"><span><i style="background:var(--s1)"></i>' + (enPct ? (cmp ? 'Tu rentabilidad' : 'Rentabilidad') : cmp ? 'Tu cartera' : 'Valor') + '</span>' + (enPct ? '' : '<span><i style="background:var(--s2)"></i>Aportado</span>') + (cmp ? '<span><i style="background:var(--s3)"></i>' + esc(refNombre(cmp)) + '</span>' : '') + '</div>' +
    '<div class="chart" id="' + chartId + '" data-ref="' + esc(cmp ? refNombre(cmp) : '') + '"></div><p class="sub" style="margin:6px 2px 0;font-size:12px">Toca la gráfica para ver el detalle de cada día.</p>' + per + cmpTxt + '</div>' };
}
function vCartera() {
  const cids = D.carteras.map(c => c.id), multi = cids.length > 1;
  if (!multi) ui.cart = cids[0]; else if (ui.cart !== 'total' && !cids.includes(ui.cart)) ui.cart = 'total';
  const isTot = multi && ui.cart === 'total', cName = (D.carteras.find(c => c.id === ui.cart) || {}).nombre || '';
  const cartChips = multi ? '<div class="chips" role="group" aria-label="Cartera">' + [['total', 'Total']].concat(D.carteras.map(c => [c.id, c.nombre])).map(c => '<button class="chip" style="text-transform:none" data-act="cCart" data-c="' + esc(c[0]) + '" aria-pressed="' + (ui.cart === c[0]) + '">' + esc(c[1]) + '</button>').join('') + '<button class="chip" style="text-transform:none" data-act="addCart" aria-label="Nueva cartera">+ Nueva</button></div>' : '';
  const cartHead = '<div style="display:flex;justify-content:flex-end"><button class="btn sm ghost" data-act="' + (multi ? 'editCarts' : 'addCart') + '">' + (multi ? 'Carteras' : '+ Añadir otra cartera') + '</button></div>';
  const fl = isTot ? D.fondos : D.fondos.filter(f => f.c === ui.cart), T = totalFondos(fl);
  const aviso = D.ajustes.avisoCompras ? '<div class="card"><h2>Nuevo: cada fondo tiene sus compras</h2><p class="sub">Ahora todo se apunta en un solo sitio: las compras y ventas de cada fondo, con su importe y sus participaciones. Hemos pasado ahí lo que tenías apuntado. Toca cada fondo y comprueba que coincide con tu bróker: si algo estaba repetido, bórralo; si un importe dice «estimado», pon el real.</p><button class="btn sm" data-act="avisoOk">Entendido</button></div>' : '';
  const sum = T.n ? '<div class="card stat"><div class="l">Valor hoy' + (multi && !isTot ? ' · ' + esc(cName) : '') + '</div><div class="v">' + eur(T.val) + '</div>' + deltaPill(red2(T.gan), T.pct) +
    '<div class="d">Has aportado ' + eur(T.ap) + (T.ult ? ' · precios del ' + esc(dLabel(T.ult)) : '') + (T.pend ? ' · ' + T.pend + (T.pend > 1 ? ' compras pendientes' : ' compra pendiente') + ' de precio' : '') + '</div></div>' : '';
  // Total: cuánto hay en cada cartera
  const porCard = isTot ? '<div class="card"><div class="card-head"><h2>Por cartera</h2></div><div class="list">' + D.carteras.map(c => { const t = totalFondos(D.fondos.filter(f => f.c === c.id)); return '<button class="item plain" data-act="cCart" data-c="' + esc(c.id) + '"><span class="t"><b>' + esc(c.nombre) + '</b><small>' + (t.n ? 'Aportado ' + eur(t.ap) + (T.val > 0 ? ' · ' + (t.val / T.val * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' % del total' : '') : 'Sin compras todavía') + '</small></span><span class="r">' + (t.n ? eur(t.val) + '<small class="' + (t.gan >= 0 ? 'dn-t' : 'up-t') + '">' + (t.gan >= 0 ? '▲ ' : '▼ ') + sgn(t.gan) + eur(Math.abs(t.gan)) + '</small>' : '—') + '</span></button>'; }).join('') + '</div></div>' : '';
  const EV = T.n ? evolBloque(fl, '', 'eRango', 'chEvol') : { html: '', serie: [] }, evol = EV.html, serie = EV.serie;
  // Tus fondos, con lo que pesa cada uno en la cartera.
  const filas = T.inf.slice().sort((a, b) => b.val - a.val);
  const estado = i => (!i.fo.isin ? 'Sin ISIN: vale lo que aportaste' : i.pa ? uFmt(i.u) + ' part. · ' + precioFmt(i.pa.p) + ' (' + dLabel(i.pa.f) + ')' : vErr(i.fo.isin) ? 'No encuentro su precio: revisa el ISIN' : 'Buscando su precio…') + (i.pend ? ' · ' + i.pend + ' pendiente' + (i.pend > 1 ? 's' : '') + ' de precio' : '') + (isTot ? ' · ' + esc((D.carteras.find(c => c.id === i.fo.c) || {}).nombre || '') : '');
  const fila = (i, k) => '<button class="item plain" data-act="editFondo" data-id="' + esc(i.fo.id) + '"><span class="t"><b><i class="dot" style="background:var(--s' + (k % 5 + 1) + ')"></i>' + esc(fNombre(i.fo)) + '</b><small>' + estado(i) + '</small><small>' +
    (i.fo.compras.length ? 'Aportado ' + eur(i.ap) + (T.val > 0 && i.val > 0 ? ' · ' + (i.val / T.val * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' % de la cartera' : '') : 'Sin compras: tócalo para añadir la primera') + '</small></span>' +
    '<span class="r">' + (i.fo.compras.length ? eur(i.val) + (i.pct != null ? '<small class="' + (i.gan >= 0 ? 'dn-t' : 'up-t') + '">' + (i.gan >= 0 ? '▲ ' : '▼ ') + sgn(i.gan) + eur(Math.abs(i.gan)) + ' · ' + pct(i.pct) + '</small>' : '') : '—') + '</span></button>';
  const fondos = fl.length ? '<div class="card"><div class="card-head"><h2>Tus fondos</h2>' + (isTot ? '' : '<button class="btn sm ghost" data-act="addFondo">+ Fondo</button>') + '</div>' +
    (filas.filter(i => i.val > 0).length > 1 ? '<div class="splitbar" aria-hidden="true">' + filas.map((i, k) => (i.val > 0 ? '<span style="width:' + (i.val / T.val * 100) + '%;background:var(--s' + (k % 5 + 1) + ')"></span>' : '')).join('') + '</div>' : '') +
    '<div class="list">' + filas.map(fila).join('') + '</div></div>'
    : isTot ? '' : '<div class="card"><div class="card-head"><h2>Tus fondos</h2></div><p class="sub" style="margin:0 0 10px">Añade cada fondo con su ISIN y después sus compras (fecha e importe o participaciones). La app busca sola su precio de cada día y calcula cuánto vale tu cartera y cuánto ganas.</p><button class="btn" data-act="addFondo">' + icon('plus') + 'Añadir fondo</button></div>';
  return { html: '<div class="page">' + vh('Cartera', multi ? 'Tus carteras, plataforma por plataforma' : 'Lo que tienes invertido, al día', 'cartera') + cartChips + cartHead + bkpBanner() + aviso + sum + porCard + evol + fondos + '</div>',
    after() { drawEvol($('#chEvol'), serie); } };
}

const secName = id => { const x = D.secciones.find(y => y.id === id); return x ? x.nombre : id; };
function vSeg() {
  if (!D.secciones.some(x => x.id === ui.segTipo)) ui.segTipo = D.secciones[0].id;
  const tipo = ui.segTipo, items = D.seg.filter(p => p.tipo === tipo);
  const groups = [...new Set(items.map(p => p.grupo))];
  const rs = items.map(rentPos).filter(r => r != null), avg = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null;
  const chips = '<div class="chips" role="group" aria-label="Sección">' + D.secciones.map(x => '<button class="chip" style="text-transform:none" data-act="segTipo" data-t="' + esc(x.id) + '" aria-pressed="' + (tipo === x.id) + '">' + esc(x.nombre) + '</button>').join('') + '<button class="chip" style="text-transform:none" data-act="addSec" aria-label="Nueva sección">+ Nueva</button></div>';
  const head = '<div style="display:flex;justify-content:flex-end;align-items:center;gap:10px;flex-wrap:wrap">' + (items.some(p => !autoPrecio(p)) ? '<button class="btn sm ghost" data-act="precios">Actualizar precios</button>' : '') + '<button class="btn sm ghost" data-act="editSecs">Secciones</button></div>';
  const sum = items.length ? '<p style="font-size:14px;color:var(--ink2);font-weight:600;padding:0 2px">' + items.length + ' en seguimiento' + (avg != null ? ' · rentabilidad media <span class="' + (avg >= 0 ? 'dn-t' : 'up-t') + '">' + (avg >= 0 ? '▲ ' : '▼ ') + pct(avg) + '</span>' : ' · sin precios actuales todavía') + '</p>' : '';
  const body = items.length ? '<div class="card">' + groups.map(g => '<div class="grp">' + esc(g) + '</div><div class="list">' + items.filter(p => p.grupo === g).map(p => {
    const r = rentPos(p), a = autoPrecio(p), m = monedaPos(p), hoy = precioHoy(p);
    return '<button class="item plain" data-act="editSeg" data-id="' + esc(p.id) + '">' + posLogo(p) + '<span class="t"><b>' + esc(p.nombre) + '</b><small>' + esc(p.ticker || '') + (p.precioEntrada != null ? ' · entrada ' + money(p.precioEntrada, m) : '') + (a ? ' · precio del ' + esc(dLabel(a.f)) : '') + '</small></span><span class="r">' + (hoy != null ? money(hoy, m) : '<small>sin precio</small>') + (r != null ? '<small class="' + (r >= 0 ? 'dn-t' : 'up-t') + '">' + (r >= 0 ? '▲ ' : '▼ ') + pct(r) + '</small>' : '') + '</span></button>';
  }).join('') + '</div>').join('') + '</div>' : empty('Aún no hay nada en «' + esc(secName(tipo)) + '». Toca + para añadir la primera posición.');
  return { html: '<div class="page">' + vh('Seguimiento', 'Paper trading: sin dinero real', 'seguimiento') + chips + head + sum + body + (items.length && D.ajustes.logos ? '<p class="credit">' + CREDIT + '</p>' : '') + '</div>' };
}

/* Inmueble: simulación mes a mes. Devuelve lo que pones, lo que te sobra cada año, lo que te queda al vender y la TIR. */
const INM_RULES = {
  precio: [1, 1e8, 'Precio de compra'], impCompra: [0, 30, 'Impuesto de compra'], otros: [0, 1e7, 'Notaría, registro y gestoría'], reforma: [0, 1e7, 'Reforma inicial'],
  ltv: [0, 100, 'Hipoteca (% del precio)'], tipo: [0, 30, 'Interés anual'], plazo: [1, 40, 'Años de hipoteca'],
  alquiler: [0, 1e6, 'Alquiler al mes'], vacio: [0, 12, 'Meses al año sin inquilino'], gestion: [0, 50, 'Gestión del alquiler'], subida: [-10, 20, 'Subida anual'],
  comunidad: [0, 1e5, 'Comunidad'], ibi: [0, 1e6, 'IBI'], seguro: [0, 1e6, 'Seguro'], mant: [0, 1e6, 'Mantenimiento'],
  anios: [1, 50, 'Años que lo tendrías'], revalor: [-20, 30, 'Revalorización anual'], gastosVenta: [0, 30, 'Gastos de venta'], impAlq: [0, 60, 'Impuesto del alquiler'], impGan: [0, 60, 'Impuesto de la ganancia'], alt: [-50, 100, 'Rentabilidad alternativa']
};
function inmParse(S) {
  const p = {};
  for (const k of Object.keys(INM_RULES)) {
    const [lo, hi, lab] = INM_RULES[k], raw = String(S[k] == null ? '' : S[k]).trim();
    if (raw === '') { if (k === 'precio' || k === 'anios') return { err: 'Pon «' + lab + '» para empezar.' }; if (k === 'plazo' && num(S.ltv) > 0) return { err: 'Pon «' + lab + '» (la hipoteca necesita un plazo).' }; p[k] = 0; continue; }
    const v = num(raw);
    if (v == null || v < lo || v > hi) return { err: 'Revisa «' + lab + '»: tiene que ser un número entre ' + lo.toLocaleString('es-ES') + ' y ' + hi.toLocaleString('es-ES') + '.' };
    p[k] = v;
  }
  return { p };
}
function irrAnual(cf) {
  const npv = r => { let t = 0, f = 1; const q = 1 / (1 + r); for (let i = 0; i < cf.length; i++) { t += cf[i] * f; f *= q; } return t; };
  let lo = -0.2, hi = 0.5, a = npv(lo), b = npv(hi);
  if (!(a * b < 0)) return null;
  for (let k = 0; k < 200; k++) { const m = (lo + hi) / 2, v = npv(m); if ((v > 0) === (a > 0)) { lo = m; a = v; } else hi = m; }
  return (Math.pow(1 + (lo + hi) / 2, 12) - 1) * 100;
}
function inmCalc(p) {
  const loan = (p.precio * p.ltv) / 100, i = p.tipo / 1200, nPay = Math.round(p.plazo * 12);
  const cuota = loan <= 0 ? 0 : i === 0 ? loan / nPay : (loan * i) / (1 - Math.pow(1 + i, -nPay));
  const impC = (p.precio * p.impCompra) / 100, entrada = p.precio - loan, cash0 = entrada + impC + p.otros + p.reforma, coste = p.precio + impC + p.otros + p.reforma;
  const n = Math.round(p.anios * 12), gastosAnio = p.comunidad * 12 + p.ibi + p.seguro + p.mant;
  let bal = loan, y = { rent: 0, gastos: 0, gest: 0, int: 0, cap: 0, tax: 0, flow: 0 }, acc = { rent: 0, gastos: 0, int: 0 }, sumFlow = 0, neg = 0;
  const cf = [-cash0];
  for (let t = 1; t <= n; t++) {
    const g = Math.pow(1 + p.subida / 100, Math.floor((t - 1) / 12));
    const rentM = (p.alquiler * g * (12 - p.vacio)) / 12, gastosM = (gastosAnio / 12) * g, gestM = (rentM * p.gestion) / 100;
    let pay = 0, intM = 0, capM = 0;
    if (t <= nPay && bal > 0) { intM = bal * i; capM = Math.min(cuota - intM, bal); bal -= capM; pay = intM + capM; }
    acc.rent += rentM; acc.gastos += gastosM + gestM; acc.int += intM;
    let tax = 0;
    if (t % 12 === 0 || t === n) { tax = (p.impAlq / 100) * Math.max(0, acc.rent - acc.gastos - acc.int); acc = { rent: 0, gastos: 0, int: 0 }; }
    const flow = rentM - gastosM - gestM - pay - tax;
    if (t <= 12) { y.rent += rentM; y.gastos += gastosM; y.gest += gestM; y.int += intM; y.cap += capM; y.tax += tax; y.flow += flow; }
    sumFlow += flow; if (flow < 0) neg -= flow; cf.push(flow);
  }
  const venta = p.precio * Math.pow(1 + p.revalor / 100, n / 12), gV = (venta * p.gastosVenta) / 100;
  const gan = venta - gV - coste, taxG = (p.impGan / 100) * Math.max(0, gan), neto = venta - gV - bal - taxG;
  cf[n] += neto;
  const profit = neto + sumFlow - cash0, invertido = cash0 + neg;
  return { loan, cuota, impC, entrada, cash0, coste, n, venta, gV, deuda: bal, taxG, neto, profit, invertido, roi: invertido > 0 ? (profit / invertido) * 100 : null, tir: irrAnual(cf), y,
    bruta: p.precio > 0 ? ((p.alquiler * 12) / p.precio) * 100 : 0, neta: coste > 0 ? ((p.alquiler * (12 - p.vacio)) - gastosAnio - (p.alquiler * (12 - p.vacio) * p.gestion) / 100) / coste * 100 : 0, coc: cash0 > 0 ? (y.flow / cash0) * 100 : null };
}

function invFormHTML() {
  if (!ui.sim) {
    const TC = totalFondos(D.fondos), hoy = todayISO(), mes = D.fondos.reduce((a, fo) => a + (fo.plan && !(fo.plan.hasta && fo.plan.hasta < hoy) ? fo.plan.imp : 0), 0);
    ui.sim = { ini: TC.val > 0 ? fmtIn(Math.round(TC.val)) : '', mes: mes > 0 ? fmtIn(Math.round(mes)) : '', anios: '10', rent: '7', infl: '', meta: '' };
  }
  const S = ui.sim, f = (id, label, val, ph, help) => '<div class="fld"><label for="' + id + '">' + label + '</label><input id="' + id + '" inputmode="decimal" autocomplete="off" placeholder="' + ph + '" value="' + esc(val) + '">' + (help ? '<span class="help">' + help + '</span>' : '') + '</div>';
  return '<div class="card"><h2>Inversión</h2><p class="sub">Pon unos números y mira cuánto podrías tener con fondos, acciones u otra inversión. Es una simulación, no una promesa.</p><div id="escForm" role="group" aria-label="Datos de la simulación" style="display:flex;flex-direction:column;gap:12px">' +
    '<div class="row2">' + f('esIni', 'Dinero que tienes (€)', S.ini, '0', S.ini ? 'Es tu cartera actual; cámbialo si quieres.' : '') + f('esMes', 'Aportación al mes (€)', S.mes, '0') + '</div>' +
    '<div class="row2">' + f('esAn', 'Durante cuántos años', S.anios, '10') + f('esRent', 'Rentabilidad anual (%)', S.rent, '7', 'Un ejemplo, no una predicción.') + '</div>' +
    '<div class="row2">' + f('esMeta', 'Meta (€, opcional)', S.meta, 'Ej. 20000', 'Te digo cuánto aportar al mes.') + f('esInfl', 'Inflación anual (%, opcional)', S.infl, 'Ej. 2', 'Para ver el resultado en euros de hoy.') + '</div>' +
    '</div></div><div id="escOut" style="display:flex;flex-direction:column;gap:14px"></div>';
}
const INM_GRUPOS = [
  ['La compra', 'Lo que pagas para hacerte con la vivienda.', [['precio', 'Precio de compra (€)', '150000'], ['impCompra', 'Impuesto de compra (%)', '4', 'En Euskadi el general de vivienda usada es el 4 %, pero depende de tu caso. Confírmalo con tu Hacienda Foral.'], ['otros', 'Notaría, registro y gestoría (€)', '2500'], ['reforma', 'Reforma inicial (€)', '0']]],
  ['La hipoteca', 'Pon 0 en el porcentaje si pagas todo al contado.', [['ltv', 'Lo que presta el banco (% del precio)', '80'], ['tipo', 'Interés anual (%)', '3'], ['plazo', 'Años de hipoteca', '25']]],
  ['El alquiler', 'Lo que cobras y lo que cuesta alquilar.', [['alquiler', 'Alquiler al mes (€)', '800'], ['vacio', 'Meses al año sin inquilino', '1', 'Para vacíos y cambios de inquilino.'], ['gestion', 'Gestión o agencia (% del alquiler)', '0'], ['subida', 'Subida anual del alquiler y los gastos (%)', '2']]],
  ['Gastos de la vivienda', 'Lo que pagas tú, tenga o no tenga inquilino.', [['comunidad', 'Comunidad al mes (€)', '40'], ['ibi', 'IBI al año (€)', '300'], ['seguro', 'Seguro al año (€)', '150'], ['mant', 'Mantenimiento y averías al año (€)', '400']]],
  ['La venta y los impuestos', 'Cuánto tiempo la tendrías y qué pasaría al venderla.', [['anios', 'Años que la tendrías', '15'], ['revalor', 'Revalorización anual (%)', '2', 'Un ejemplo, no una predicción.'], ['gastosVenta', 'Gastos de venta (%)', '4', 'Agencia, plusvalía municipal, etc.'], ['impAlq', 'Impuesto sobre el beneficio del alquiler (%)', '20', 'Depende de tu caso y de tu comunidad.'], ['impGan', 'Impuesto sobre la ganancia al vender (%)', '19', 'Depende de tu caso y de tu comunidad.']]],
  ['Para comparar', 'Con qué quieres comparar el inmueble.', [['alt', 'Rentabilidad alternativa (%)', '7', 'Por ejemplo, la de un fondo indexado.']]]
];
function inmFormHTML() {
  if (!ui.inm) ui.inm = Object.assign({}, INM0);
  const f = x => '<div class="fld" style="justify-content:flex-end"><label for="im_' + x[0] + '">' + x[1] + '</label><input id="im_' + x[0] + '" inputmode="decimal" autocomplete="off" placeholder="' + x[2] + '" value="' + esc(ui.inm[x[0]]) + '"></div>';
  const grupos = INM_GRUPOS.map(g => {
    const rows = []; for (let k = 0; k < g[2].length; k += 2) {
      const par = g[2].slice(k, k + 2);
      rows.push('<div style="display:flex;flex-direction:column;gap:6px"><div class="row2">' + par.map(f).join('') + (par.length === 1 ? '<div></div>' : '') + '</div>' + par.filter(x => x[3]).map(x => '<span class="help" style="font-size:12px;color:var(--muted);font-weight:600"><b>' + x[1].replace(/ \(.*\)$/, '') + ':</b> ' + x[3] + '</span>').join('') + '</div>');
    }
    return '<div class="card"><h2>' + g[0] + '</h2><p class="sub" style="margin-bottom:10px">' + g[1] + '</p><div style="display:flex;flex-direction:column;gap:12px">' + rows.join('') + '</div></div>';
  }).join('');
  return '<p class="sub" style="padding:0 2px;font-size:14px;color:var(--ink2)">Los números de abajo son un ejemplo: cámbialos por los de la vivienda que estés mirando. Se guardan en este móvil para la próxima vez.</p><div id="escForm" role="group" aria-label="Datos del inmueble" style="display:flex;flex-direction:column;gap:14px">' + grupos + '</div><div id="escOut" style="display:flex;flex-direction:column;gap:14px"></div>';
}
// Escenarios → Comparar: tu cartera (todas las carteras) frente a un índice, con lo mismo invertido los mismos días, y cada fondo frente a ese índice.
/* Escenarios → Comparar → Activos: hasta 4 fondos, acciones o índices cualesquiera (no hace falta tenerlos), en euros.
   Todos empiezan en 0 % el primer día del periodo; debajo, rentabilidad, media al año, peor caída y lo que valdrían 1.000 €. */
const L_PER = [['1m', '1 mes', 1], ['6m', '6 meses', 6], ['1a', '1 año', 12], ['3a', '3 años', 36], ['5a', '5 años', 60]];
function libreCfg() {
  const l = D.ajustes.libre || {}, qs = (Array.isArray(l.qs) ? l.qs : []).map(vKey).filter(q => /^[A-Z0-9.\-^=:]{1,24}$/.test(q));
  return { qs: [...new Set(qs)].slice(0, 4), per: L_PER.some(x => x[0] === l.per) ? l.per : '1a' };
}
const libreDesde = per => { const m = (L_PER.find(x => x[0] === per) || L_PER[2])[2], h = todayISO(); return addM(mk(h), -m) + h.slice(7); };
function libreDatos() {
  const L = libreCfg(), ini = libreDesde(L.per), filas = L.qs.map(q => {
    const ser = refSerie(q), r = { q, nombre: refNombre(q), err: VV[q] && VV[q].err };
    if (!ser || !ser.ds.length || (VV[q] && VV[q].desde > ini)) return r;   // sin precios, o aún llegando el historial del periodo elegido
    const b = buscaDesde(ser, ini) || (ser.ds[0] <= todayISO() && ser.ds[0] > ini ? { f: ser.ds[0], p: ser.precios[ser.ds[0]] } : null); if (!b) return r;
    const ds = ser.ds.filter(d => d >= b.f), last = ser.precios[ds[ds.length - 1]], tot = last / b.p - 1, dias = (Date.parse(ds[ds.length - 1]) - Date.parse(b.f)) / 864e5;
    let pico = b.p, caida = 0; ds.forEach(d => { const p = ser.precios[d]; if (p > pico) pico = p; caida = Math.min(caida, p / pico - 1); });
    return Object.assign(r, { ser, base: b, desde: b.f, tot: tot * 100, anual: dias >= 300 ? (Math.pow(1 + tot, 365 / dias) - 1) * 100 : null, caida: caida * 100, mil: 1000 * (1 + tot), parcial: b.f > ini });
  });
  const ok = filas.filter(f => f.ser), dias = [...new Set(ok.flatMap(f => f.ser.ds.filter(d => d >= f.base.f)))].sort();
  const pts = dias.map(d => ({ d, v: filas.map(f => { if (!f.ser || d < f.base.f) return null; const pa = buscaAntes(f.ser, d); return pa ? (pa.p / f.base.p - 1) * 100 : null; }) }));
  return { L, filas, pts };
}
function drawMulti(el, pts, nombres) {
  if (!el) return;
  if (pts.length < 2) { el.innerHTML = empty('Cuando lleguen los precios, aquí verás cómo ha ido cada uno.'); return; }
  const W = Math.max(el.clientWidth, 260), H = 230, L = 54, R = 16, T = 14, B = 28, iw = W - L - R, ih = H - T - B, n = pts.length;
  const vs = pts.flatMap(p => p.v).filter(v => v != null).concat([0]), mn = Math.min(...vs), mx = Math.max(...vs), span = Math.max(mx - mn, 0.5), step = niceStep(span / 3);
  const lo = Math.floor((mn - span * 0.1) / step) * step, top = Math.ceil((mx + span * 0.1) / step) * step;
  const x = i => L + (iw * i) / (n - 1), y = v => T + ih - ((v - lo) / (top - lo)) * ih, fy = v => (v > 0.0001 ? '+' : v < -0.0001 ? '−' : '') + Math.abs(Math.round(v * 10) / 10).toLocaleString('es-ES') + ' %';
  let s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" style="touch-action:pan-y" aria-label="Rentabilidad de cada activo en el periodo">';
  for (let v = lo; v <= top + 1e-9; v += step) s += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + fy(v) + '</text>';
  s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0) + '" y2="' + y(0) + '" style="stroke:var(--ink2);stroke-width:1"/>';
  nombres.forEach((_, j) => { s += '<path d="' + pts.map((p, i) => (p.v[j] == null ? '' : (i && pts[i - 1].v[j] != null ? 'L' : 'M') + x(i) + ' ' + y(p.v[j]))).join(' ') + '" fill="none" style="stroke:var(--s' + (j + 1) + ');stroke-width:2.2;stroke-linejoin:round"/>'; });
  [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i).forEach(i => { s += '<text x="' + Math.min(Math.max(x(i), L + 20), W - R - 20) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(dLabel(pts[i].d)) + '</text>'; });
  s += '<line class="cursor" x1="0" x2="0" y1="' + T + '" y2="' + (T + ih) + '" style="display:none"/>';
  el.innerHTML = s + '</svg><div class="gtip" hidden></div>';
  const svg = el.querySelector('svg'), box = el.querySelector('.gtip'), cur = el.querySelector('.cursor');
  const mostrar = ev => {
    const r = svg.getBoundingClientRect(), i = Math.max(0, Math.min(n - 1, Math.round((((ev.clientX - r.left) * (W / r.width) - L) / iw) * (n - 1)))), p = pts[i];
    cur.setAttribute('x1', x(i)); cur.setAttribute('x2', x(i)); cur.style.display = '';
    let h = '<b>' + esc(dLabel(p.d)) + '</b>' + nombres.map((nm, j) => '<br><span style="color:var(--s' + (j + 1) + ')">●</span> ' + esc(nm) + ': ' + (p.v[j] == null ? '—' : pct(p.v[j]))).join('');
    if (nombres.length === 2 && p.v[0] != null && p.v[1] != null) { const d = p.v[0] - p.v[1]; h += '<br>Diferencia: ' + (d >= 0 ? '+' : '−') + Math.abs(Math.round(d * 10) / 10).toLocaleString('es-ES') + ' puntos'; }
    box.innerHTML = h; box.hidden = false;
    const bw = box.offsetWidth, cx = x(i) * (r.width / W);
    box.style.left = Math.max(0, Math.min(cx - bw / 2, r.width - bw)) + 'px';
  };
  svg.addEventListener('pointerdown', mostrar);
  svg.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons) mostrar(e); });
  svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { box.hidden = true; cur.style.display = 'none'; } });
}
function libreHTML() {
  const { L, filas, pts } = libreDatos();
  const elegir = '<div class="card"><p class="sub" style="margin:0 0 10px">Compara fondos, acciones o índices aunque no los tengas: cuánto habría ganado alguien que invierte en euros en cada uno.</p>' +
    '<div class="chips" style="flex-wrap:wrap;overflow:visible">' + L.qs.map((q, j) => '<button class="chip" style="text-transform:none" data-act="libreQuitar" data-q="' + esc(q) + '" aria-label="Quitar ' + esc(refNombre(q)) + '"><i class="dot" style="background:var(--s' + (j + 1) + ')"></i>' + esc(refNombre(q)) + ' ×</button>').join('') +
    (L.qs.length < 4 ? '<button class="chip" style="text-transform:none" data-act="libreAdd">+ Añadir</button>' : '') + '</div>' +
    '<div class="chips" role="group" aria-label="Periodo" style="margin-top:8px">' + L_PER.map(x => '<button class="chip" style="text-transform:none" data-act="librePer" data-r="' + x[0] + '" aria-pressed="' + (L.per === x[0]) + '">' + x[1] + '</button>').join('') + '</div></div>';
  if (!L.qs.length) return { html: elegir + '<div class="card"><p class="sub" style="margin:0">Añade un fondo, una acción o un índice para empezar.</p></div>', after() {} };
  const grafica = '<div class="card"><div class="card-head"><h2>Desde ' + esc(dLabel(libreDesde(L.per))) + '</h2></div><div class="legend">' + filas.map((f, j) => '<span><i style="background:var(--s' + (j + 1) + ')"></i>' + esc(f.nombre) + '</span>').join('') + '</div>' +
    '<div class="chart" id="chLibre"></div><p class="sub" style="margin:6px 2px 0;font-size:12px">Todos empiezan en 0 %. Toca la gráfica para ver el detalle de cada día.</p></div>';
  const tabla = '<div class="card"><div class="card-head"><h2>Resultado</h2></div><div class="list">' + filas.map((f, j) => '<div class="item plain"><span class="t"><b><i class="dot" style="background:var(--s' + (j + 1) + ')"></i>' + esc(f.nombre) + '</b><small>' +
    (f.err ? 'No encuentro «' + esc(f.q) + '»: revisa el ISIN o el ticker' : f.tot == null ? 'Cargando sus precios…' : (f.anual != null ? 'Media al año: ' + pct(f.anual) + ' · ' : '') + 'Peor caída: ' + pct(f.caida) + (f.parcial ? ' · solo desde ' + esc(dLabel(f.desde)) : '')) + '</small></span>' +
    '<span class="r">' + (f.tot == null ? '—' : '<span class="' + (f.tot >= 0 ? 'dn-t' : 'up-t') + '">' + pct(f.tot) + '</span><small>1.000 € → ' + eur(f.mil, 0) + '</small>') + '</span></div>').join('') + '</div>' +
    '<p class="sub" style="margin:8px 2px 0">En euros (lo que está en dólares se pasa con el cambio de cada día). Lo pasado no asegura lo que vendrá.</p></div>';
  return { html: elegir + grafica + tabla, after() { drawMulti($('#chLibre'), pts, filas.map(f => f.nombre)); } };
}
/* Ficha de un activo (lupa de arriba): cualquier fondo, acción o índice por ISIN o ticker, aunque no lo tengas.
   Precio en su moneda, gráfica de 1 mes a 5 años, rentabilidad por periodos, media al año y peor caída,
   y botones para seguirlo, compararlo o apuntarlo en tu cartera. Los datos se guardan solo mientras la app está abierta. */
const FICHAS = new Map();
async function fichaDatos(q) {
  if (FICHAS.has(q)) return FICHAS.get(q);
  let r, j;
  try { r = await fetch(API + '?q=' + encodeURIComponent(q) + '&desde=' + libreDesde('5a')); j = await r.json().catch(() => null); } catch (e) { return { err: 'Sin conexión: inténtalo cuando tengas internet.' }; }
  if (!r.ok || !j || !j.precios) return { err: (j && j.error) || 'No he podido traer sus precios. Prueba en un rato.' };
  const precios = {}; Object.keys(j.precios).forEach(d => { const x = j.precios[d]; if (isDate(d) && typeof x === 'number' && isFinite(x) && x > 0) precios[d] = x; });
  const f = { q, nombre: String(j.nombre || q).slice(0, 90), moneda: j.moneda === 'USD' ? 'USD' : 'EUR', yahoo: String(j.yahoo || ''), precios, ds: Object.keys(precios).sort() };
  if (f.ds.length) FICHAS.set(q, f);
  return f.ds.length ? f : { err: 'Sin precios para ' + q + '.' };
}
const fichaPer = (f, m) => {   // rentabilidad en los últimos m meses (null si el activo es más nuevo)
  const ult = f.ds[f.ds.length - 1], ini = addM(mk(ult), -m) + ult.slice(7), b = buscaDesde(f, ini);
  return b && f.ds[0] <= ini ? { b, tot: (f.precios[ult] / b.p - 1) * 100, dias: (Date.parse(ult) - Date.parse(b.f)) / 864e5 } : null;
};
function drawPrecio(el, f, desde) {
  if (!el) return;
  const ds = f.ds.filter(d => d >= desde), n = ds.length, ps = ds.map(d => f.precios[d]);
  if (n < 2) { el.innerHTML = empty('Aún no hay suficientes precios para este periodo.'); return; }
  const W = Math.max(el.clientWidth, 260), H = 210, L = 58, R = 16, T = 14, B = 28, iw = W - L - R, ih = H - T - B;
  const mn = Math.min(...ps), mx = Math.max(...ps), span = Math.max(mx - mn, mx * 0.01), step = niceStep(span / 3);
  const lo = Math.max(0, Math.floor((mn - span * 0.1) / step) * step), top = Math.ceil((mx + span * 0.1) / step) * step;
  const x = i => L + (iw * i) / (n - 1), y = v => T + ih - ((v - lo) / (top - lo)) * ih, sube = ps[n - 1] >= ps[0];
  let s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" style="touch-action:pan-y" aria-label="Precio de ' + esc(f.nombre) + '">';
  for (let v = lo; v <= top + 1e-9; v += step) s += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + money(Math.round(v * 100) / 100, f.moneda).replace(/,00(?=\s)/, '') + '</text>';
  const linea = ps.map((v, i) => (i ? 'L' : 'M') + x(i) + ' ' + y(v)).join(' ');
  s += '<path d="' + linea + ' L' + x(n - 1) + ' ' + (T + ih) + ' L' + x(0) + ' ' + (T + ih) + ' Z" style="fill:var(--' + (sube ? 'good' : 'bad') + ');opacity:.12;stroke:none"/>';
  s += '<path d="' + linea + '" fill="none" style="stroke:var(--' + (sube ? 'good' : 'bad') + ');stroke-width:2.2;stroke-linejoin:round"/>';
  [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i).forEach(i => { s += '<text x="' + Math.min(Math.max(x(i), L + 20), W - R - 20) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(dLabel(ds[i])) + '</text>'; });
  s += '<line class="cursor" x1="0" x2="0" y1="' + T + '" y2="' + (T + ih) + '" style="display:none"/>';
  el.innerHTML = s + '</svg><div class="gtip" hidden></div>';
  const svg = el.querySelector('svg'), box = el.querySelector('.gtip'), cur = el.querySelector('.cursor');
  const mostrar = ev => {
    const r = svg.getBoundingClientRect(), i = Math.max(0, Math.min(n - 1, Math.round((((ev.clientX - r.left) * (W / r.width) - L) / iw) * (n - 1))));
    cur.setAttribute('x1', x(i)); cur.setAttribute('x2', x(i)); cur.style.display = '';
    box.innerHTML = '<b>' + esc(dLabel(ds[i])) + '</b><br>' + money(ps[i], f.moneda) + '<br>Desde el principio: ' + pct((ps[i] / ps[0] - 1) * 100); box.hidden = false;
    const bw = box.offsetWidth, cx = x(i) * (r.width / W); box.style.left = Math.max(0, Math.min(cx - bw / 2, r.width - bw)) + 'px';
  };
  svg.addEventListener('pointerdown', mostrar);
  svg.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons) mostrar(e); });
  svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { box.hidden = true; cur.style.display = 'none'; } });
}
function fichaHTML(f) {
  const ult = f.ds[f.ds.length - 1], ant = f.ds[f.ds.length - 2], hoy = f.precios[ult], dia = ant ? (hoy / f.precios[ant] - 1) * 100 : null;
  const per = L_PER.find(x => x[0] === ui.fPer) || L_PER[2], ini = addM(mk(ult), -per[2]) + ult.slice(7), sel = fichaPer(f, per[2]);
  const dsP = f.ds.filter(d => d >= ini); let pico = 0, caida = 0; dsP.forEach(d => { const v = f.precios[d]; if (v > pico) pico = v; caida = Math.min(caida, v / pico - 1); });
  const esIsin = isIsin(f.q), sigue = D.seg.some(x => vKey(x.ticker) === f.q), tiene = esIsin && D.fondos.some(fo => fo.isin === f.q);
  const chip = (lab, r) => '<div class="fchip"><small>' + lab + '</small><b class="' + (r == null ? '' : r.tot >= 0 ? 'dn-t' : 'up-t') + '">' + (r == null ? '—' : pct(r.tot)) + '</b></div>';
  return '<div class="form"><div><div class="sub" style="margin:0">' + esc(f.q) + (f.yahoo && f.yahoo !== f.q ? ' · ' + esc(f.yahoo) : '') + (f.moneda === 'USD' ? ' · en dólares' : '') + '</div>' +
      '<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-top:4px"><b style="font-size:28px;letter-spacing:-.02em" class="num">' + money(hoy, f.moneda) + '</b>' +
      (dia != null ? '<span class="pill ' + (dia >= 0 ? 'good' : 'bad') + '">' + (dia >= 0 ? '▲ ' : '▼ ') + pct(dia) + '</span>' : '') + '</div><div class="sub" style="margin:2px 0 0">Precio del ' + esc(dLabel(ult)) + '</div></div>' +
    '<div class="chips" role="group" aria-label="Periodo">' + L_PER.map(x => '<button type="button" class="chip" style="text-transform:none" data-act="fichaPer" data-r="' + x[0] + '" aria-pressed="' + (per[0] === x[0]) + '">' + x[1] + '</button>').join('') + '</div>' +
    '<div class="chart" id="chFicha"></div>' +
    '<div class="fchips">' + chip('1 mes', fichaPer(f, 1)) + chip('6 meses', fichaPer(f, 6)) + chip('1 año', fichaPer(f, 12)) + chip('3 años', fichaPer(f, 36)) + chip('5 años', fichaPer(f, 60)) + '</div>' +
    '<p class="sub" style="margin:0">En ' + per[1] + ': ' + (sel ? (sel.dias >= 300 ? 'media al año ' + pct((Math.pow(1 + sel.tot / 100, 365 / sel.dias) - 1) * 100) + ' · ' : '') : 'no hay datos de todo el periodo · ') + 'peor caída ' + pct(caida * 100) + '. Lo pasado no asegura lo que vendrá.</p>' +
    '<div class="btn-row"><button type="button" class="btn sm' + (sigue ? ' ghost' : '') + '" data-act="fichaSeguir" data-q="' + esc(f.q) + '">' + (sigue ? 'Ya lo sigues' : 'Seguir') + '</button><button type="button" class="btn sm ghost" data-act="fichaComparar" data-q="' + esc(f.q) + '">Comparar</button>' +
      (esIsin ? '<button type="button" class="btn sm ghost" data-act="fichaTengo" data-q="' + esc(f.q) + '">' + (tiene ? 'Apuntar compra' : 'Lo tengo') + '</button>' : '') + '</div></div>';
}
async function sheetFicha(q) {
  q = vKey(q); ui.fichaQ = q;
  const f0 = FICHAS.get(q);
  openSheet(f0 ? f0.nombre : 'Buscando…', f0 ? fichaHTML(f0) : '<div class="form"><p class="sub" style="margin:0">Buscando «' + esc(q) + '» y sus precios de los últimos 5 años…</p></div>');
  if (f0) { drawPrecio($('#chFicha'), f0, fichaIni(f0)); return; }
  const f = await fichaDatos(q);
  if (ui.fichaQ !== q || !$('#sheet').open) return;   // mientras tanto se ha cerrado o se ha buscado otra cosa
  if (f.err) { openSheet('No lo encuentro', '<div class="form"><p style="margin:0">' + esc(f.err) + '</p><p class="sub" style="margin:0">Un fondo se busca por su ISIN (por ejemplo IE00B4L5Y983); una acción, por su ticker (AAPL, o BME:ITX si no es de EE. UU.).</p><button type="button" class="btn sm ghost" style="align-self:flex-start" data-act="buscar">Buscar otro</button></div>'); return; }
  openSheet(f.nombre, fichaHTML(f)); drawPrecio($('#chFicha'), f, fichaIni(f));
}
const fichaIni = f => { const per = L_PER.find(x => x[0] === ui.fPer) || L_PER[2], ult = f.ds[f.ds.length - 1]; return addM(mk(ult), -per[2]) + ult.slice(7); };
function sheetBuscar() {
  const cands = [...new Set(REFS0.map(r => r[0]).concat(D.fondos.map(fo => vKey(fo.isin)).filter(Boolean), D.seg.map(x => vKey(x.ticker)).filter(Boolean)))].slice(0, 16);
  openSheet('Buscar',
    '<div class="form"><div class="fld"><label for="bQ">Fondo, acción o índice</label><input id="bQ" name="q" maxlength="24" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ISIN o ticker: IE00B4L5Y983, AAPL…" style="text-transform:uppercase"><span class="help">Un fondo, por su ISIN. Una acción, por su ticker (con la bolsa delante si no es de EE. UU.: BME:ITX).</span></div>' +
    (cands.length ? '<div class="fld"><span class="lb">O mira uno de los tuyos</span><div class="chips" style="flex-wrap:wrap;overflow:visible">' + cands.map(q => '<button type="button" class="chip" style="text-transform:none" data-act="ficha" data-q="' + esc(q) + '">' + esc(refNombre(q)) + '</button>').join('') + '</div></div>' : '') +
    actions('', 'Buscar') + '</div>',
    fd => { const q = vKey(fd.get('q')); if (!/^[A-Z0-9.\-^=:]{1,24}$/.test(q)) return 'Escribe un ISIN o un ticker.'; sheetFicha(q); return ''; });
  setTimeout(() => { const i = $('#bQ'); if (i) i.focus(); }, 60);
}
// Añadir un activo a «Comparar activos»: por ISIN o ticker, o tocando uno de los que ya conoces.
function sheetLibreAdd() {
  const L = libreCfg(), cands = [...new Set(REFS0.map(r => r[0]).concat((D.ajustes.refs || []).map(r => r.q), D.fondos.map(fo => vKey(fo.isin)).filter(Boolean), D.seg.map(x => vKey(x.ticker)).filter(Boolean)))].filter(q => !L.qs.includes(q)).slice(0, 14);
  openSheet('Añadir para comparar',
    '<div class="form"><div class="fld"><label for="lQ">ISIN o ticker</label><input id="lQ" name="q" maxlength="24" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="IE00B4L5Y983, AAPL, BME:ITX…" style="text-transform:uppercase"><span class="help">Un fondo por su ISIN; una acción por su ticker (con la bolsa delante si no es de EE. UU.: BME:ITX).</span></div>' +
    (cands.length ? '<div class="fld"><span class="lb">O elige uno</span><div class="chips" style="flex-wrap:wrap;overflow:visible">' + cands.map(q => '<button type="button" class="chip" style="text-transform:none" data-act="libreElegir" data-q="' + esc(q) + '">' + esc(refNombre(q)) + '</button>').join('') + '</div></div>' : '') +
    actions('', 'Añadir') + '</div>',
    fd => {
      const q = vKey(fd.get('q'));
      if (!/^[A-Z0-9.\-^=:]{1,24}$/.test(q)) return 'Pon un ISIN o un ticker, o toca uno de la lista.';
      libreMeter(q);
    });
  setTimeout(() => { const i = $('#lQ'); if (i) i.focus(); }, 60);
}
function libreMeter(q) { const L = libreCfg(); if (!L.qs.includes(q)) L.qs.push(q); D.ajustes.libre = { qs: L.qs.slice(0, 4), per: L.per }; save(); render(); setTimeout(loadVivo, 50); }
function cmpHTML() {
  const modo = D.ajustes.cmpModo === 'activos' ? 'activos' : 'cartera';
  const seg = '<div><div class="seg" role="group" aria-label="Qué comparar"><button data-act="cmpModo" data-v="cartera" aria-pressed="' + (modo === 'cartera') + '">Mi cartera</button><button data-act="cmpModo" data-v="activos" aria-pressed="' + (modo === 'activos') + '">Activos</button></div></div>';
  const C = modo === 'activos' ? libreHTML() : cmpCartera();
  return { html: seg + C.html, after: C.after };
}
function cmpCartera() {
  const fl = D.fondos, T = totalFondos(fl);
  if (!T.n) return { after() {}, html: '<div class="card"><h2>Compara tu cartera con un índice</h2><p class="sub" style="margin:0">Primero apunta tus fondos y sus compras en <a class="link" href="#/cartera">Cartera</a>. Después verás aquí si lo estás haciendo mejor o peor que el MSCI World o el S&P 500.</p></div>' };
  if (!D.ajustes.cmp) { D.ajustes.cmp = REFS0[0][0]; save(); setTimeout(loadVivo, 50); }
  const cmp = D.ajustes.cmp, EV = evolBloque(fl, cmp, 'kRango', 'chCmp'), hoy = todayISO(), n = esc(refNombre(cmp));
  const sel = '<div class="card"><p class="sub" style="margin:0 0 10px">¿Y si cada compra la hubieras hecho el mismo día, con los mismos euros, en un índice? Así ves si tu cartera lo está haciendo mejor o peor.' + (D.carteras.length > 1 ? ' Cuenta todas tus carteras.' : '') + '</p>' +
    '<div class="fld"><label for="refSel">Comparar con</label><select id="refSel">' + refsTodas().map(r => '<option value="' + esc(r[0]) + '"' + (r[0] === cmp ? ' selected' : '') + '>' + esc(refNombre(r[0])) + '</option>').join('') + '<option value="+">Otro índice o fondo…</option></select></div></div>';
  const filas = fl.filter(fo => fo.compras.length).map(fo => { const sim = simulaRef([fo], cmp); return { fo, i: fondoInfo(fo), v: sim ? sim(hoy) : null }; }).sort((x, y) => y.i.val - x.i.val);
  const lista = '<div class="card"><div class="card-head"><h2>Cada fondo frente a ' + n + '</h2></div><p class="sub" style="margin:0 0 4px">Desde la primera compra de cada fondo.</p><div class="list">' + filas.map(x => {
    const dif = x.v == null ? null : x.i.val - x.v;
    return '<div class="item plain"><span class="t"><b>' + esc(fNombre(x.fo)) + '</b><small>' + (x.v == null ? refEstado(cmp) : 'Tu fondo ' + eur(x.i.val) + ' · con ' + n + ' ' + eur(x.v)) + '</small></span><span class="r">' +
      (dif == null ? '—' : '<span class="' + (dif >= 0 ? 'dn-t' : 'up-t') + '">' + (dif >= 0 ? '▲ ' : '▼ ') + eur(Math.abs(dif)) + '</span><small>' + (dif >= 0 ? 'por delante' : 'por detrás') + '</small>') + '</span></div>';
  }).join('') + '</div></div>';
  return { after() { drawEvol($('#chCmp'), EV.serie); }, html: sel + EV.html + lista };
}
function vEsc() {
  const tipo = ['inm', 'cmp'].includes(ui.escTipo) ? ui.escTipo : 'inv';
  const seg = '<div><div class="seg" role="group" aria-label="Tipo de escenario"><button data-act="escTipo" data-t="inv" aria-pressed="' + (tipo === 'inv') + '">Inversión</button><button data-act="escTipo" data-t="inm" aria-pressed="' + (tipo === 'inm') + '">Inmueble</button><button data-act="escTipo" data-t="cmp" aria-pressed="' + (tipo === 'cmp') + '">Comparar</button></div></div>';
  const sub = tipo === 'inm' ? 'Mira si te sale a cuenta comprar una vivienda para alquilarla' : tipo === 'cmp' ? 'Tu cartera frente a un índice, o unos activos frente a otros' : 'Calcula cómo podría crecer tu dinero';
  if (tipo === 'cmp') { const C = cmpHTML(); return { html: '<div class="page">' + vh('Escenarios', sub, 'escenarios') + seg + C.html + '</div>', after: C.after }; }
  return { html: '<div class="page">' + vh('Escenarios', sub, 'escenarios') + seg + (tipo === 'inm' ? inmFormHTML() : invFormHTML()) + '</div>', after() { renderEsc(); } };
}
function readEsc() {
  if (ui.escTipo === 'inm') { const o = Object.assign({}, ui.inm || INM0); Object.keys(INM0).forEach(k => { const el = $('#im_' + k); if (el) o[k] = el.value; }); ui.inm = o; persistEsc(); }
  else if (ui.escTipo === 'inv') readInv();
}
function renderEsc() { if (ui.escTipo === 'inm') renderInm(); else if (ui.escTipo === 'inv') renderInv(); }
function readInv() { const v = id => (($('#' + id) || {}).value || ''); ui.sim = { ini: v('esIni'), mes: v('esMes'), anios: v('esAn'), rent: v('esRent'), infl: v('esInfl'), meta: v('esMeta') }; }
function renderInv() {
  const out = $('#escOut'); if (!out || !ui.sim) return;
  const S = ui.sim, opt0 = t => (String(t).trim() === '' ? 0 : num(t));
  const ini = opt0(S.ini), mes = opt0(S.mes), an = num(S.anios), r = num(S.rent), inf = opt0(S.infl), meta = String(S.meta).trim() === '' ? null : num(S.meta);
  const bad = m => { out.innerHTML = empty(m); };
  if (ini == null || ini < 0 || mes == null || mes < 0) return bad('Revisa el dinero que tienes y la aportación: tienen que ser números de 0 o más.');
  if (!ini && !mes) return bad('Pon el dinero que tienes o lo que aportas al mes para empezar.');
  if (an == null || an < 0.5 || an > 60) return bad('Pon los años que quieres simular (entre 0,5 y 60).');
  if (r == null || r < -50 || r > 100) return bad('Pon la rentabilidad anual como un número entre −50 y 100.');
  if (inf == null || inf < 0 || inf > 50) return bad('La inflación tiene que estar entre 0 y 50.');
  if (meta != null && !(meta > 0)) return bad('La meta tiene que ser mayor que 0, o déjala vacía.');
  const n = Math.round(an * 12), rm = rmOf(r), final = fvOf(ini, mes, rm, n), aport = ini + mes * n, gan = final - aport, anTxt = an === 1 ? '1 año' : an.toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' años';
  const rows = []; for (let m = 0; m <= n; m += 12) rows.push({ y: m / 12, valor: fvOf(ini, mes, rm, m), aport: ini + mes * m });
  if (n % 12) rows.push({ y: n / 12, valor: final, aport });
  const rtxt = x => x.toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' %';
  let h = '<div class="card stat"><div class="l">Dentro de ' + anTxt + ' tendrías</div><div class="v">' + eur(final, 0) + '</div><span class="pill ' + (gan > 0 ? 'good' : gan < 0 ? 'bad' : 'flat') + '">' + (gan > 0 ? '▲' : gan < 0 ? '▼' : '') + ' ' + sgn(gan) + eur(Math.abs(gan), 0) + (aport > 0 ? ' · ' + pct((gan / aport) * 100) : '') + '</span>' +
    '<div class="d">Habrías aportado ' + eur(aport, 0) + ' en total' + (gan > 0 ? ' y el resto (' + eur(gan, 0) + ') lo habría puesto la rentabilidad.' : '.') + '</div>' +
    (inf > 0 ? '<div class="d">En euros de hoy, con ' + rtxt(inf) + ' de inflación al año: <b>' + eur(final / Math.pow(1 + inf / 100, n / 12), 0) + '</b></div>' : '') + '</div>';
  if (meta != null) {
    const pw = Math.pow(1 + rm, n), need = rm === 0 ? (meta - ini) / n : ((meta - ini * pw) * rm) / (pw - 1), ahora = mes > 0 ? ' (ahora pones ' + eur(mes, 0) + ')' : '';
    h += '<div class="card"><h2>Para llegar a ' + eur(meta, 0) + '</h2><p style="font-size:14px;margin:0">' + (need <= 0 ? 'Solo con lo que ya tienes llegarías a tu meta, sin aportar nada más.' : final >= meta ? 'Llegarías a tu meta. Te bastaría con aportar <b>' + eur(need, 0) + ' al mes</b>' + ahora + '.' : 'Necesitarías aportar <b>' + eur(need, 0) + ' al mes</b>' + ahora + ', es decir, ' + eur(need - mes, 0) + ' más al mes.') + '</p></div>';
  }
  const sc = [r - 3, r, r + 3].filter(x => x >= -50 && x <= 100);
  h += '<div class="card"><h2>¿Y si la rentabilidad fuera otra?</h2><p class="sub">Nadie sabe qué rentabilidad saldrá. Mira el abanico.</p><div class="splitleg">' + sc.map(x => '<div><span>' + (x === r ? '<b>Con tu ' + rtxt(x) + '</b>' : 'Con ' + rtxt(x)) + '</span><span class="num">' + eur(fvOf(ini, mes, rmOf(x), n), 0) + '</span></div>').join('') + '</div></div>';
  h += '<div class="card"><div class="card-head"><h2>Cómo crecería</h2></div><div class="legend"><span><i style="background:var(--s1)"></i>Lo que tendrías</span><span><i style="background:var(--s2)"></i>Lo que habrías aportado</span></div><div class="chart" id="chEsc"></div></div>' +
    '<p class="sub" style="text-align:center;padding:0 8px;font-size:12.5px;color:var(--muted)">Simulación sencilla: la rentabilidad real cambia cada año y puede ser negativa. No es una promesa ni un consejo de inversión.</p>';
  out.innerHTML = h; drawProj($('#chEsc'), rows);
}
function renderInm() {
  const out = $('#escOut'); if (!out || !ui.inm) return;
  const pr = inmParse(ui.inm); if (pr.err) { out.innerHTML = empty(pr.err); return; }
  const p = pr.p, R = inmCalc(p), pc1 = x => x.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %', sg = v => (Math.round(v) < 0 ? '−' : Math.round(v) > 0 ? '+' : '') + eur(Math.abs(v), 0);
  const cls = v => (Math.round(v) > 0 ? 'dn-t' : Math.round(v) < 0 ? 'up-t' : ''), anTxt = p.anios === 1 ? '1 año' : p.anios.toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' años';
  const row = (l, v, b, c) => '<div><span>' + (b ? '<b>' + l + '</b>' : l) + '</span><span class="num' + (c ? ' ' + c : '') + '">' + (b ? '<b>' + v + '</b>' : v) + '</span></div>';
  const tirTxt = R.tir == null ? 'La rentabilidad anual (TIR) no se puede calcular con estos números: con ellos no recuperarías el dinero que pones.' : '<b>' + pc1(R.tir) + ' al año</b> de rentabilidad media de todo el dinero que pones y recibes (TIR), frente a ' + pc1(p.alt) + ' de tu alternativa: ' + (R.tir > p.alt + 0.05 ? 'en números, sale mejor el inmueble.' : R.tir < p.alt - 0.05 ? 'en números, sale mejor tu alternativa.' : 'prácticamente igual.');
  let h = '<div class="card stat"><div class="l">Si la vendes dentro de ' + anTxt + ', te quedarían</div><div class="v">' + eur(R.neto, 0) + '</div>' +
    '<span class="pill ' + (Math.round(R.profit) > 0 ? 'good' : Math.round(R.profit) < 0 ? 'bad' : 'flat') + '">' + (R.profit > 0 ? '▲' : R.profit < 0 ? '▼' : '') + ' ' + sg(R.profit) + ' de ganancia total' + (R.roi != null ? ' · ' + pct(R.roi) : '') + '</span>' +
    '<div class="d">Es lo que queda tras pagar la hipoteca pendiente, los gastos de venta y los impuestos. En total habrás puesto ' + eur(R.invertido, 0) + ' de tu bolsillo (entrada, gastos y lo que falte cada mes). La ganancia incluye también lo que te sobre del alquiler.</div>' +
    '<div class="d" style="margin-top:8px">' + tirTxt + '</div></div>';
  h += '<div class="card"><h2>Para comprarla, pones</h2><div class="splitleg" style="margin-top:10px">' + row('Entrada (lo que no presta el banco)', eur(R.entrada, 0)) + row('Impuesto de compra', eur(R.impC, 0)) + row('Notaría, registro y gestoría', eur(p.otros, 0)) + (p.reforma > 0 ? row('Reforma', eur(p.reforma, 0)) : '') + row('Total al empezar', eur(R.cash0, 0), true) + '</div>' +
    (R.loan > 0 ? '<p style="font-size:14px;margin:12px 0 0">Hipoteca de <b>' + eur(R.loan, 0) + '</b>: cuota de <b>' + eur(R.cuota, 2) + ' al mes</b> durante ' + p.plazo.toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' años.</p>' : '<p style="font-size:14px;margin:12px 0 0">Sin hipoteca: lo pagas todo al contado.</p>') + '</div>';
  const y = R.y, devuelve = y.cap;
  h += '<div class="card"><h2>El primer año, en números</h2><p class="sub" style="margin-bottom:10px">Con los años el alquiler y los gastos suben, y la parte de la cuota que son intereses baja.</p><div class="splitleg">' +
    row('Alquiler cobrado', eur(y.rent, 0), false, 'dn-t') + row('Gastos de la vivienda', '−' + eur(y.gastos, 0)) + (y.gest > 0 ? row('Gestión del alquiler', '−' + eur(y.gest, 0)) : '') +
    (R.loan > 0 ? row('Intereses de la hipoteca', '−' + eur(y.int, 0)) + row('Capital que devuelves al banco', '−' + eur(devuelve, 0)) : '') + (y.tax > 0 ? row('Impuestos del alquiler', '−' + eur(y.tax, 0)) : '') +
    row('Te sobra (o te falta) en el año', sg(y.flow), true, cls(y.flow)) + '</div>' +
    '<p style="font-size:14px;margin:12px 0 0">Eso son <b class="' + cls(y.flow) + '">' + sg(y.flow / 12) + ' al mes</b>. ' + (R.loan > 0 ? 'Ojo: el capital que devuelves no es un gasto perdido, es dinero tuyo que pasa a ser parte de la vivienda.' : '') + '</p></div>';
  h += '<div class="card"><h2>Rentabilidad del alquiler</h2><div class="splitleg" style="margin-top:10px">' + row('Bruta (alquiler al año ÷ precio)', pc1(R.bruta)) + row('Neta (sin hipoteca ni impuestos)', pc1(R.neta)) + row('Año 1 sobre lo que pones', R.coc == null ? '—' : pc1(R.coc)) + '</div>' +
    '<p class="sub" style="margin:10px 0 0">La <b>bruta</b> es la que salen en los anuncios. La <b>neta</b> descuenta gastos y vacíos y cuenta también lo que pagas al comprar. La última mide el año 1 frente a tu dinero puesto, con la hipoteca ya pagada.</p></div>';
  h += '<div class="card"><h2>Al venderla, dentro de ' + anTxt + '</h2><div class="splitleg" style="margin-top:10px">' + row('Valor de venta (con ' + pc1(p.revalor) + ' al año)', eur(R.venta, 0)) + row('Gastos de venta', '−' + eur(R.gV, 0)) + (R.loan > 0 ? row('Hipoteca pendiente', '−' + eur(R.deuda, 0)) : '') + (R.taxG > 0 ? row('Impuesto sobre la ganancia', '−' + eur(R.taxG, 0)) : '') + row('Te quedan', eur(R.neto, 0), true) + '</div></div>';
  const sc = [p.revalor - 2, p.revalor, p.revalor + 2].filter(x => x >= -20 && x <= 30);
  h += '<div class="card"><h2>¿Y si la vivienda se revalorizara de otra forma?</h2><p class="sub" style="margin-bottom:10px">Nadie sabe cuánto subirá o bajará. Es lo que más cambia el resultado.</p><div class="splitleg">' + sc.map(x => { const q = inmCalc(Object.assign({}, p, { revalor: x })); return '<div><span>' + (x === p.revalor ? '<b>Con tus ' + pc1(x) + '</b>' : 'Con ' + pc1(x)) + '</span><span class="num">' + eur(q.neto, 0) + ' <em>' + (q.tir == null ? 'sin TIR' : 'TIR ' + pc1(q.tir)) + '</em></span></div>'; }).join('') + '</div></div>';
  h += '<p class="sub" style="text-align:center;padding:0 8px;font-size:12.5px;color:var(--muted)">Simulación sencilla: usa los valores que has puesto, con la hipoteca a interés fijo y sin impagos ni obras grandes. Los impuestos dependen de cada caso y comunidad; consulta a un asesor antes de decidir. No es un consejo de inversión.</p>';
  out.innerHTML = h;
}
function vObj() {
  const body = D.objetivos.length ? D.objetivos.map(o => {
    const p = Math.min(100, (o.ahorrado / o.meta) * 100), falta = Math.max(o.meta - o.ahorrado, 0), done = o.ahorrado >= o.meta;
    let extra = '';
    if (o.fecha && !done) { const m = monthsLeft(o.fecha); extra = m > 0 ? ' · ' + eur(falta / m, 0) + ' al mes hasta ' + esc(dLabel(o.fecha)) : ' · la fecha ya ha pasado'; }
    return '<div class="card goal"><div class="goal-top"><div><h3>' + esc(o.nombre) + '</h3><p class="meta">Meta ' + eur(o.meta, 0) + (o.fecha ? ' · para ' + esc(dLabel(o.fecha)) : '') + '</p></div>' + (done ? '<span class="pill good">✓ Conseguido</span>' : '<span class="pill flat">' + Math.round(p) + ' %</span>') + '</div>' +
      '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(p) + '" aria-label="Progreso de ' + esc(o.nombre) + '"><i style="width:' + p + '%"></i></div>' +
      '<div class="goal-nums"><b class="num">' + eur(o.ahorrado) + '</b><span class="num">' + (done ? 'Meta superada' : 'Faltan ' + eur(falta) + extra) + '</span></div>' +
      '<div class="btn-row"><button class="btn sm" data-act="aportar" data-id="' + esc(o.id) + '">Aportar</button><button class="btn sm ghost" data-act="editObj" data-id="' + esc(o.id) + '">Editar</button></div></div>';
  }).join('') : '<div class="card"><h2>Ahorra para algo concreto</h2><p class="sub">Un objetivo es una meta de ahorro: un viaje, el carné, el colchón para imprevistos… Pones cuánto quieres juntar y, si quieres, para cuándo.</p>' +
    '<ol class="steps"><li>Toca <b>Nuevo objetivo</b> y pon la meta. Por ejemplo: «Colchón de emergencia», 3.000 €, para diciembre de 2027.</li><li>Cada vez que guardes dinero para ello, toca <b>Aportar</b>.</li><li>Verás cuánto llevas, cuánto te falta y, si pusiste fecha, cuánto tendrías que ahorrar al mes.</li></ol>' +
    '<p class="sub" style="margin:0">¿Quieres ver cuánto podría crecer tu dinero invirtiendo? Eso está en <a class="link" href="#/escenarios">Escenarios</a>.</p></div>';
  return { html: '<div class="page">' + vh('Objetivos', 'Metas de ahorro: lo que llevas y lo que te falta', 'objetivos') + body + '</div>' };
}

function vAjustes() {
  const t = D.ajustes.tema, standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const u = D.ajustes.ultimaCopia;
  return { html: '<div class="page"><div class="vh"><div><h1>Ajustes</h1><p class="sub">Apariencia y tus datos</p></div></div>' +
    '<div class="card set"><div class="setrow"><div><b>Apariencia</b><p>Automático sigue el modo de tu móvil.</p></div><div class="seg" role="group" aria-label="Tema">' + [['auto', 'Auto'], ['claro', 'Claro'], ['oscuro', 'Oscuro']].map(a => '<button data-act="tema" data-v="' + a[0] + '" aria-pressed="' + (t === a[0]) + '">' + a[1] + '</button>').join('') + '</div></div></div>' +
    '<div class="card set"><div class="setrow"><div><b>Precios automáticos</b><p>Para tus fondos y acciones, la app pide su precio de cada día a su propio servicio de precios (con datos de Yahoo Finance). Solo envía el ISIN o el ticker, nunca tus importes.</p></div></div></div>' +
    '<div class="card set"><div class="setrow"><div><b>Logos de empresas</b><p>Los pide a Ticker Logos (así sabe qué empresas sigues, nunca tus importes) y los guarda aquí. ' + CREDIT + '</p></div><div class="seg" role="group" aria-label="Logos">' + [['1', 'Sí'], ['0', 'No']].map(a => '<button data-act="logos" data-v="' + a[0] + '" aria-pressed="' + ((D.ajustes.logos !== false) === (a[0] === '1')) + '">' + a[1] + '</button>').join('') + '</div></div></div>' +
    '<div class="card set"><h2>Tus datos</h2><p class="sub" style="margin-bottom:6px">Se guardan solo en este dispositivo. Si borras los datos del navegador o cambias de móvil, se pierden: haz copias de vez en cuando.</p>' +
    '<div class="setrow"><div><b>Copia de seguridad</b><p>' + (u ? 'Última copia: ' + esc(dLabel(u)) : 'Aún no has hecho ninguna.') + '</p></div><button class="btn sm" data-act="export">Descargar</button></div>' +
    '<div class="setrow"><div><b>Restaurar o importar</b><p>Desde un archivo de copia de Centex.</p></div><button class="btn sm ghost" data-act="pickFile">Elegir archivo</button></div>' +
    '<div class="setrow"><div><b>Gastos para Excel</b><p>Un archivo CSV con todos tus gastos.</p></div><button class="btn sm ghost" data-act="exportCsv">Descargar</button></div>' +
    '<div class="setrow"><div><b>Borrar todo</b><p>Elimina todos los datos de este dispositivo.</p></div><button class="btn sm danger" data-act="wipe">Borrar…</button></div></div>' +
    '<div class="card set"><div class="setrow"><div><b>Modo de prueba</b><p>' + (DEMO ? 'Estás viendo datos de ejemplo. Al salir vuelves a tus datos, tal como los dejaste.' : 'Mira cómo funciona Centex con datos de ejemplo, sin tocar los tuyos.') + '</p></div><button class="btn sm ghost" data-act="' + (DEMO ? 'demoOut">Salir' : 'demoIn">Probar') + '</button></div></div>' +
    '<details class="card"><summary>Privacidad y aviso legal</summary><div class="body">' +
      '<p><b>Tus datos son tuyos.</b> Todo lo que apuntas se guarda solo en este dispositivo. Centex no tiene cuentas, ni guarda tus datos en ningún servidor, ni usa cookies.</p>' +
      '<p><b>Lo único que sale a internet:</b> el ISIN o el ticker de tus fondos y acciones, para buscar su precio (en el servicio de precios de Centex, con datos de Yahoo Finance); los logos de empresas, que se piden a Ticker Logos (puedes quitarlos arriba); y un contador de visitas anónimo (GoatCounter), sin cookies ni datos personales. Nunca se envían tus importes. Si nos escribes desde «¿Ideas o algún fallo?», el mensaje (y tu correo, si lo pones) nos llega a través de Formspree.</p>' +
      '<p><b>Haz copias.</b> Si borras los datos del navegador o cambias de móvil, lo apuntado se pierde.</p>' +
      '<p><b>No es asesoramiento financiero.</b> Centex sirve para ordenar tus números. Los precios pueden llegar con retraso o tener errores, y las simulaciones son ejemplos, no promesas. Las decisiones de inversión son solo tuyas.</p>' +
    '</div></details>' +
    '<div class="card set"><div class="setrow"><div><b>¿Ideas o algún fallo?</b><p>Cuéntanos qué mejorarías o qué no funciona. Leemos todo.</p></div><button class="btn sm ghost" data-act="contacto">Escribir</button></div></div>' +
    '<div class="card"><h2>Tenerla como una app</h2>' + (standalone ? '<p class="sub" style="margin-bottom:0">Ya estás usando Centex como app.</p>' :
      '<p class="sub">Añádela a tu pantalla de inicio y se abrirá a pantalla completa.</p><ol class="steps"><li><b>iPhone (Safari):</b> botón compartir → «Añadir a pantalla de inicio».</li><li><b>Android (Chrome):</b> menú ⋮ → «Instalar aplicación» o «Añadir a pantalla de inicio».</li></ol>') + '</div>' +
    '<p style="text-align:center;color:var(--muted);font-size:12.5px;font-weight:600;padding:6px">Centex · versión ' + VERSION_APP + ' · 28 oct 2026</p></div>' };
}

const VIEWS = { inicio: vInicio, gastos: vGastos, cartera: vCartera, seguimiento: vSeg, objetivos: vObj, escenarios: vEsc, ajustes: vAjustes };

function render() {
  const r = route(), v = VIEWS[r]();
  document.querySelectorAll('.nav-link').forEach(a => { if (a.dataset.r === r) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const view = $('#view'); view.innerHTML = DEMO ? v.html.replace('<div class="page">', '<div class="page">' + demoBanner()) : v.html; if (v.after) v.after();
  hydrateLogos();
  const f = fabOf(r), fab = $('#fab');
  if (f) { fab.hidden = false; fab.dataset.act = f[1]; $('#fabTx').textContent = f[0]; fab.setAttribute('aria-label', f[0]); } else fab.hidden = true;
  const names = { inicio: 'Inicio', gastos: 'Gastos', cartera: 'Cartera', seguimiento: 'Seguimiento', objetivos: 'Objetivos', escenarios: 'Escenarios', ajustes: 'Ajustes' };
  document.title = names[r] + ' · Centex';
}

/* ---------- 6. formularios (hojas emergentes) ---------- */
let sheetFn = null;
function openSheet(title, html, fn) {
  $('#sheetTitle').textContent = title; $('#sheetBody').innerHTML = html; sheetFn = fn || null;
  const d = $('#sheet'); if (!d.open) d.showModal();
  d.scrollTop = 0;
}
function closeSheet() { const d = $('#sheet'); if (d.open) d.close(); sheetFn = null; }
function sheetErr(m) { const e = $('#sheetErr'); if (e) e.textContent = m; }
const opt = (name, value, checked, label) => '<label class="opt"><input type="radio" name="' + name + '" value="' + esc(value) + '"' + (checked ? ' checked' : '') + '><span>' + label + '</span></label>';
const actions = (del, label) => '<div class="err" id="sheetErr" role="alert"></div><div class="sheet-actions">' + del + '<button class="btn" type="submit">' + label + '</button></div>';
const delBtn = (kind, id) => '<button type="button" class="btn danger" data-act="sheetDel" data-kind="' + kind + '" data-id="' + esc(id) + '">Borrar</button>';

function sheetGasto(id, pre) {
  const g = id ? D.gastos.find(x => x.id === id) : null;
  const v = g || Object.assign({ fecha: todayISO(), desc: '', cat: 'Comida', cant: '', pago: 'Tarjeta' }, pre);
  openSheet(g ? 'Editar gasto' : 'Nuevo gasto',
    '<div class="form"><div class="fld amount"><label for="fCant">Cantidad (€)</label><input id="fCant" name="cant" inputmode="decimal" autocomplete="off" placeholder="0,00" value="' + (g || pre ? fmtIn(v.cant) : '') + '"></div>' +
    '<div class="fld"><span class="lb">Categoría</span><div class="opts" role="radiogroup" aria-label="Categoría">' + CATS.map(c => opt('cat', c, v.cat === c, catIcon(c, true) + c)).join('') + '</div></div>' +
    '<div class="fld"><label for="fDesc">Descripción</label><input id="fDesc" name="desc" autocomplete="off" maxlength="80" placeholder="Menú, cine, bus…" value="' + esc(v.desc) + '"></div>' +
    '<div class="row2"><div class="fld"><label for="fFecha">Fecha</label><input id="fFecha" name="fecha" type="date" value="' + v.fecha + '"></div><div class="fld"><span class="lb">Pago</span><div class="opts" role="radiogroup" aria-label="Forma de pago">' + ['Tarjeta', 'Efectivo'].map(p => opt('pago', p, v.pago === p, p)).join('') + '</div></div></div>' +
    actions(g ? delBtn('gasto', id) : '', g ? 'Guardar' : 'Añadir gasto') + '</div>',
    fd => {
      const cant = num(fd.get('cant')), fecha = fd.get('fecha');
      if (!(cant > 0)) return 'Pon una cantidad mayor que 0.';
      if (!isDate(fecha)) return 'Pon una fecha válida.';
      const o = { id: g ? g.id : uid(), fecha, desc: String(fd.get('desc') || '').trim().slice(0, 80), cat: CATS.includes(fd.get('cat')) ? fd.get('cat') : 'Otros', cant: Math.round(cant * 100) / 100, pago: fd.get('pago') === 'Efectivo' ? 'Efectivo' : 'Tarjeta' };
      if (g) D.gastos[D.gastos.indexOf(g)] = o; else D.gastos.push(o);
      save(); ui.gMes = mk(fecha); render(); toast(g ? 'Gasto actualizado' : 'Gasto guardado');
    });
  setTimeout(() => { const i = $('#fCant'); if (i && !g) { i.focus(); if (pre) i.select(); } }, 60);
}

function sheetSeg(id) {
  const p = id ? D.seg.find(x => x.id === id) : null;
  const v = p || { tipo: ui.segTipo, grupo: '', nombre: '', ticker: '', fecha: '', precioEntrada: '', precioActual: '', motivo: '', web: '' };
  const groups = [...new Set(D.seg.map(x => x.grupo))], a = p ? autoPrecio(p) : null, cur = a && a.moneda === 'USD' ? 'US$' : '€';
  const actFld = a ? '<div class="fld"><span class="lb">Precio actual</span><input type="hidden" name="pact" value="' + fmtIn(v.precioActual) + '"><b style="font-size:17px;padding:10px 0">' + money(a.p, a.moneda) + '</b><span class="help">Automático, del ' + esc(dLabel(a.f)) + '</span></div>'
    : '<div class="fld"><label for="sAct">Precio actual (€)</label><input id="sAct" name="pact" inputmode="decimal" autocomplete="off" value="' + fmtIn(v.precioActual) + '"></div>';
  openSheet(p ? 'Editar posición' : 'Añadir al seguimiento',
    '<div class="form"><div class="fld"><span class="lb">Sección</span><div class="opts" role="radiogroup" aria-label="Sección">' + D.secciones.map(x => opt('tipo', x.id, v.tipo === x.id, esc(x.nombre))).join('') + '</div></div>' +
    '<div class="fld"><label for="sNombre">Nombre</label><input id="sNombre" name="nombre" maxlength="80" autocomplete="off" value="' + esc(v.nombre) + '"></div>' +
    '<div class="row2"><div class="fld"><label for="sGrupo">Sector o tipo</label><input id="sGrupo" name="grupo" list="dlGrupos" maxlength="60" autocomplete="off" placeholder="Tecnología, Value…" value="' + esc(v.grupo) + '"><datalist id="dlGrupos">' + groups.map(g => '<option value="' + esc(g) + '">').join('') + '</datalist></div><div class="fld"><label for="sTicker">Ticker o ISIN</label><input id="sTicker" name="ticker" maxlength="30" autocomplete="off" value="' + esc(v.ticker) + '"></div></div>' +
    '<div class="row2"><div class="fld"><label for="sEnt">Precio de entrada (' + cur + ')</label><input id="sEnt" name="pent" inputmode="decimal" autocomplete="off" value="' + fmtIn(v.precioEntrada) + '"></div>' + actFld + '</div>' +
    '<div class="fld"><span class="help">Si tiene precio automático, pon el de entrada en la moneda en que cotiza: dólares si es de EE. UU.; euros si es europea.</span></div>' + (!a && p && vErr(p.ticker) ? '<div class="fld"><span class="help" style="color:var(--bad)">No encuentro el precio de «' + esc(p.ticker) + '». Revisa el ticker o el ISIN (por ejemplo AAPL, BME:ITX o IE000ZYRH0Q7).</span></div>' : '') +
    '<div class="fld"><label for="sFecha">Fecha de entrada</label><input id="sFecha" name="fecha" type="date" value="' + esc(v.fecha || '') + '"></div>' +
    '<div class="fld"><label for="sWeb">Web de la empresa (opcional)</label><input id="sWeb" name="web" maxlength="80" autocomplete="off" inputmode="url" placeholder="qualcomm.com" value="' + esc(v.web || '') + '"><span class="help">Solo sirve para encontrar su logo. Si sale bien sin ponerla, déjala vacía.</span></div>' +
    '<div class="fld"><label for="sMotivo">Motivo corto</label><input id="sMotivo" name="motivo" maxlength="400" autocomplete="off" value="' + esc(v.motivo) + '"></div>' +
    (p && p.ticker ? '<button type="button" class="btn sm ghost" style="align-self:flex-start" data-act="ficha" data-q="' + esc(vKey(p.ticker)) + '">' + icon('search') + 'Ver su ficha</button>' : '') +
    actions(p ? delBtn('seg', id) : '', p ? 'Guardar' : 'Añadir') + '</div>',
    fd => {
      const nombre = String(fd.get('nombre') || '').trim(), grupo = String(fd.get('grupo') || '').trim();
      if (!nombre || !grupo) return 'Pon al menos el nombre y el sector o tipo.';
      const f = fd.get('fecha');
      const o = { id: p ? p.id : uid(), tipo: D.secciones.some(x => x.id === fd.get('tipo')) ? fd.get('tipo') : D.secciones[0].id, grupo: grupo.slice(0, 60), nombre: nombre.slice(0, 80), ticker: String(fd.get('ticker') || '').trim().slice(0, 30), web: webClean(fd.get('web')), fecha: isDate(f) ? f : null, precioEntrada: num(fd.get('pent')), precioActual: num(fd.get('pact')), motivo: String(fd.get('motivo') || '').trim().slice(0, 400) };
      if (p) D.seg[D.seg.indexOf(p)] = o; else D.seg.push(o);
      ui.segTipo = o.tipo; save(); render(); toast(p ? 'Posición actualizada' : 'Añadido al seguimiento'); setTimeout(loadVivo, 50);
    });
}

function sheetFondo(id, pre) {
  const fo = id ? D.fondos.find(x => x.id === id) : null, isins = [...new Set(Object.keys(PR).concat(Object.keys(AC), Object.keys(VV)))].filter(i => isIsin(i) && fp(i));
  const multi = D.carteras.length > 1, c0 = fo ? fo.c : (pre && pre.c) || (D.carteras.some(c => c.id === ui.cart) ? ui.cart : D.carteras[0].id);
  const v = fo || { isin: '', nombre: (pre && pre.nombre) || '', c: c0 }, hoy = todayISO();
  const cRow = c => '<button type="button" class="item plain" data-act="editCompra" data-f="' + esc(fo.id) + '" data-id="' + esc(c.id) + '"><span class="t"><b>' + esc(dLabel(c.f)) + ' · ' + (c.venta ? 'Venta' : 'Compra') +
    (c.plan ? '<span class="tag">periódica</span>' : '') + (fo.isin && (c.imp == null || c.part == null) ? '<span class="tag warn">pendiente de precio</span>' : c.est === 'imp' ? '<span class="tag warn">importe estimado</span>' : '') + '</b>' +
    '<small>' + (c.part != null ? uFmt(c.part) + (c.part === 1 ? ' participación' : ' participaciones') : 'Participaciones: cuando haya precio') + '</small></span><span class="r">' + (c.imp != null ? (c.venta ? '−' : '') + eur(c.imp) : '—') + '</span></button>';
  const p = fo && fo.plan;
  openSheet(fo ? fNombre(fo) : 'Añadir fondo',
    '<div class="form"><div class="fld"><label for="fNombre">Nombre</label><input id="fNombre" name="nombre" maxlength="60" autocomplete="off" placeholder="iShares Developed World" value="' + esc(v.nombre) + '"></div>' +
    '<div class="fld"><label for="fIsin">ISIN</label><input id="fIsin" name="isin" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="IE000ZYRH0Q7" style="text-transform:uppercase" value="' + esc(v.isin) + '"><span class="help">Con el ISIN, la app busca sola su precio de cada día. Lo ves en tu bróker, en la ficha del fondo.</span>' +
    (isins.length && !fo ? '<div class="chips" style="margin-top:6px" role="group" aria-label="Fondos con precio diario">' + isins.map(i => '<button type="button" class="chip" style="text-transform:none" data-act="fillIsin" data-isin="' + esc(i) + '" data-n="' + esc(fp(i).nombre) + '">' + esc(fp(i).nombre) + '</button>').join('') + '</div><span class="help">Toca uno para rellenar nombre e ISIN.</span>' : '') + '</div>' + (fo && fo.isin && !fp(fo.isin) && vErr(fo.isin) ? '<span class="help" style="color:var(--bad)">No encuentro el precio de este ISIN: revisa que esté bien escrito.</span>' : '') +
    (multi ? (fo ? '<input type="hidden" name="cart" value="' + esc(c0) + '">' : '<div class="fld"><span class="lb">Cartera</span><div class="opts" role="radiogroup" aria-label="Cartera">' + D.carteras.map(c => opt('cart', c.id, c.id === c0, esc(c.nombre))).join('') + '</div></div>') : '<input type="hidden" name="cart" value="' + esc(c0) + '">') +
    (fo ? '<div class="fld"><span class="lb">Compras y ventas</span>' + (fo.compras.length ? '<div class="list">' + fo.compras.slice().reverse().map(cRow).join('') + '</div>' : '<span class="help">Aún no hay ninguna.</span>') +
      '<button type="button" class="btn sm ghost" data-act="addCompra" data-f="' + esc(fo.id) + '" style="align-self:flex-start;margin-top:6px">' + icon('plus') + 'Añadir compra o venta</button></div>' +
      '<div class="fld"><span class="lb">Aportación periódica</span>' + (p ? '<span class="help" style="margin:0 0 6px">' + eur(p.imp) + ' el día ' + p.dia + ' de cada mes, desde el ' + esc(dLabel(p.desde)) + (p.hasta ? (p.hasta < hoy ? '; terminó el ' : ' hasta el ') + esc(dLabel(p.hasta)) : '') + '.</span>' : '<span class="help" style="margin:0 0 6px">Si inviertes lo mismo cada mes, la app puede apuntar sola cada compra.</span>') +
      '<button type="button" class="btn sm ghost" data-act="editPlan" data-f="' + esc(fo.id) + '" style="align-self:flex-start">' + (p ? 'Cambiar' : 'Configurar') + '</button></div>'
      : '<span class="help">Después de añadirlo podrás apuntar sus compras.</span>') +
    (fo && fo.isin ? '<button type="button" class="btn sm ghost" style="align-self:flex-start" data-act="ficha" data-q="' + esc(fo.isin) + '">' + icon('search') + 'Ver su ficha</button>' : '') +
    actions(fo ? delBtn('fondo', id) : '', fo ? 'Guardar' : 'Añadir fondo') + '</div>',
    fd => {
      const isin = String(fd.get('isin') || '').trim().toUpperCase(), cc = String(fd.get('cart') || ''); let nombre = String(fd.get('nombre') || '').trim().slice(0, 60);
      if (isin && !isIsin(isin)) return 'Ese ISIN no tiene buena pinta: son 12 letras y números (por ejemplo IE000ZYRH0Q7). Déjalo vacío si no lo tienes.';
      if (!nombre && isin && fp(isin)) nombre = fp(isin).nombre.slice(0, 60);
      if (!nombre) return 'Pon el nombre del fondo.';
      if (!D.carteras.some(c => c.id === cc)) return 'Elige una cartera.';
      const otros = D.fondos.filter(x => x.c === cc && x !== fo);
      if (isin && otros.some(x => x.isin === isin)) return 'Ese ISIN ya está en esta cartera: tócalo en la lista.';
      if (otros.some(x => normN(fNombre(x)) === normN(nombre))) return 'Ya tienes un fondo con ese nombre en esta cartera.';
      const id2 = fo ? fo.id : 'f_' + uid(), o = Object.assign({ compras: [], plan: null }, fo || {}, { id: id2, isin, nombre, c: cc });
      if (fo) D.fondos[D.fondos.indexOf(fo)] = o; else D.fondos.push(o);
      save(); render(); toast(fo ? 'Fondo actualizado' : 'Fondo añadido: ahora apunta su compra'); setTimeout(loadVivo, 50);
      if (!fo) setTimeout(() => sheetCompra(null, id2), 30);
    });
}
// Compra o venta de un fondo. Al escribir el importe se calculan las participaciones con el precio de ese día, y al revés;
// la cifra que escribe la persona manda («data-man»). Sin precio todavía, se guarda lo que haya y queda pendiente.
function sheetCompra(id, fid) {
  if (!D.fondos.length) { toast('Primero añade el fondo'); sheetFondo(); return; }
  const fo0 = D.fondos.find(x => x.id === fid) || D.fondos.find(x => x.c === ui.cart) || D.fondos[0];
  const c = id ? fo0.compras.find(x => x.id === id) : null;
  const v = c || { f: todayISO(), venta: false, imp: null, part: null, est: null };
  const lista = D.fondos.filter(f => f.c === fo0.c).concat(D.fondos.filter(f => f.c !== fo0.c)), multi = D.carteras.length > 1;
  openSheet(c ? 'Editar ' + (c.venta ? 'venta' : 'compra') : 'Añadir compra',
    '<div class="form" id="compraForm">' +
    (c ? '<input type="hidden" id="cFondo" name="fondo" value="' + esc(fo0.id) + '"><p style="margin:0;font-weight:700">' + esc(fNombre(fo0)) + '</p>'
      : '<div class="fld"><label for="cFondo">Fondo</label><select id="cFondo" name="fondo">' + lista.map(f => '<option value="' + esc(f.id) + '"' + (f === fo0 ? ' selected' : '') + '>' + esc(fNombre(f)) + (multi ? ' · ' + esc((D.carteras.find(x => x.id === f.c) || {}).nombre || '') : '') + '</option>').join('') + '</select></div>') +
    '<div class="fld"><div class="opts" role="radiogroup" aria-label="Compra o venta">' + opt('mov', 'compra', !v.venta, 'Compra') + opt('mov', 'venta', v.venta, 'Venta') + '</div></div>' +
    (c ? '' : '<div class="fld"><span class="lb">Aportación</span><div class="opts" role="radiogroup" aria-label="Puntual o periódica">' + opt('cModo', 'pun', true, 'Puntual') + opt('cModo', 'per', false, 'Periódica') + '</div></div>') +
    '<div class="fld"><label for="cFecha">Fecha</label><input id="cFecha" name="fecha" type="date" value="' + esc(v.f) + '"></div>' +
    '<div class="row2"><div class="fld"><label for="cImp">Importe (€)</label><input id="cImp" name="imp" inputmode="decimal" autocomplete="off" placeholder="0,00" data-man="' + (v.imp != null && v.est !== 'imp' ? '1' : '') + '" value="' + (v.imp != null ? fmtIn(v.imp) : '') + '"></div>' +
    '<div class="fld"><label for="cPart">Participaciones</label><input id="cPart" name="part" inputmode="decimal" autocomplete="off" placeholder="0" data-man="' + (v.part != null && v.est !== 'part' ? '1' : '') + '" value="' + (v.part != null ? fmtIn(v.part) : '') + '"></div></div>' +
    '<p class="sub" id="cPrecio" style="margin:0"></p>' +
    '<span class="help">Escribe el importe o las participaciones: la otra cifra se calcula con el precio de ese día. Si tu bróker te da las dos, pon las dos y mandan esas.</span>' +
    actions(c ? delBtn('compra', fo0.id + '|' + c.id) : '', c ? 'Guardar' : 'Añadir') + '</div>',
    fd => {
      const fo = D.fondos.find(x => x.id === fd.get('fondo')); if (!fo) return 'Elige un fondo.';
      const f = String(fd.get('fecha') || ''); if (!isDate(f)) return 'Pon una fecha válida.';
      if (f > todayISO()) return 'La fecha no puede ser de un día que aún no ha llegado. Para lo que se repite cada mes, usa «Periódica».';
      const ie = $('#cImp'), pe = $('#cPart'), iv = num(ie.value), pv = num(pe.value);
      if (ie.value.trim() && !(iv > 0)) return 'Revisa el importe.';
      if (pe.value.trim() && !(pv > 0)) return 'Revisa las participaciones.';
      let mi = ie.dataset.man === '1' && iv > 0, mp = pe.dataset.man === '1' && pv > 0;
      if (!mi && !mp) { mi = iv > 0; mp = !mi && pv > 0; }
      if (!mi && !mp) return 'Pon el importe o las participaciones.';
      const pa = fo.isin ? priceFrom(fo.isin, f) : null;
      const o = { id: c ? c.id : uid(), f, venta: fd.get('mov') === 'venta', imp: mi ? red2(iv) : null, part: mp ? redP(pv) : null, est: null };
      if (c && c.plan) o.plan = c.plan;
      if (o.imp == null) { o.est = 'imp'; if (pa) o.imp = red2(o.part * pa.p); }
      else if (o.part == null) { o.est = 'part'; if (pa) o.part = redP(o.imp / pa.p); }
      if (o.venta && o.part != null) {
        const tiene = fo.compras.filter(x => x !== c && x.f <= f && x.part != null).reduce((a, x) => a + sgnC(x) * x.part, 0);
        if (o.part > tiene + 1e-6) return 'Ese día tenías ' + uFmt(tiene) + ' participaciones: no puedes vender más.';
      }
      if (c) fo.compras[fo.compras.indexOf(c)] = o; else fo.compras.push(o);
      fo.compras.sort(byF);
      save(); render(); toast(c ? 'Guardado' : o.venta ? 'Venta apuntada' : 'Compra apuntada'); setTimeout(loadVivo, 50);
    });
  compraCalc(null);
  setTimeout(() => { const i = $('#cImp'); if (i && !c) i.focus(); }, 60);
}
// Recalcula la cifra que no ha escrito la persona y enseña el precio que aplica a esa fecha.
function compraCalc(t) {
  const ie = $('#cImp'), pe = $('#cPart'), info = $('#cPrecio'); if (!ie || !pe || !info) return;
  if (t === ie) ie.dataset.man = ie.value.trim() ? '1' : '';
  if (t === pe) pe.dataset.man = pe.value.trim() ? '1' : '';
  const f = ($('#cFecha') || {}).value, fo = D.fondos.find(x => x.id === ($('#cFondo') || {}).value);
  const pa = fo && fo.isin && isDate(f) ? priceFrom(fo.isin, f) : null;
  info.innerHTML = !fo || !fo.isin ? 'Este fondo no tiene ISIN: pon el importe y, si las sabes, las participaciones.'
    : pa ? 'Precio ' + (pa.f === f ? 'de ese día' : 'que aplica (' + esc(dLabel(pa.f)) + ')') + ': <b class="num">' + precioFmt(pa.p) + '</b>'
    : 'Todavía no hay precio de ese día: la compra quedará «pendiente de precio» y se completará sola en cuanto se publique.';
  const mi = ie.dataset.man === '1', mp = pe.dataset.man === '1', iv = num(ie.value), pv = num(pe.value);
  if (mi && !mp) pe.value = pa && iv > 0 ? fmtIn(Math.round((iv / pa.p) * 1e4) / 1e4) : '';
  else if (mp && !mi) ie.value = pa && pv > 0 ? fmtIn(red2(pv * pa.p)) : '';
}
// Aportación periódica de un fondo: importe, día del mes, desde y (opcional) hasta.
function sheetPlan(fid) {
  const fo = D.fondos.find(x => x.id === fid); if (!fo) return;
  const p = fo.plan, v = p || { imp: '', dia: Math.min(+todayISO().slice(8, 10), 28), desde: todayISO(), hasta: null };
  openSheet('Aportación periódica',
    '<div class="form"><p style="margin:0;font-weight:700">' + esc(fNombre(fo)) + '</p>' +
    '<p class="sub" style="margin:0">Como en tu bróker: cada mes, el día que elijas, la app apunta sola la compra con el precio de ese día (o del siguiente día con precio). Puedes corregir o borrar cualquiera desde la lista de compras del fondo.</p>' +
    '<div class="row2"><div class="fld"><label for="pImp">Importe cada mes (€)</label><input id="pImp" name="imp" inputmode="decimal" autocomplete="off" placeholder="100" value="' + fmtIn(v.imp) + '"></div><div class="fld"><label for="pDia">Día del mes</label><input id="pDia" name="dia" type="number" min="1" max="28" inputmode="numeric" value="' + v.dia + '"></div></div>' +
    '<div class="row2"><div class="fld"><label for="pDesde">Desde</label><input id="pDesde" name="desde" type="date" value="' + esc(v.desde) + '"></div><div class="fld"><label for="pHasta">Hasta (opcional)</label><input id="pHasta" name="hasta" type="date" value="' + esc(v.hasta || '') + '"></div></div>' +
    '<span class="help">Si la empezaste hace meses, pon la fecha real de inicio y se apuntarán las compras que falten. Para pararla, pon la fecha de «Hasta». Si la borras, las compras ya apuntadas se quedan.</span>' +
    actions(p ? delBtn('plan', fo.id) : '', p ? 'Guardar' : 'Activar') + '</div>',
    fd => {
      const imp = num(fd.get('imp')), dia = Math.round(num(fd.get('dia'))), desde = String(fd.get('desde') || ''), hasta = String(fd.get('hasta') || '');
      if (!(imp > 0)) return 'Pon el importe de cada mes.';
      if (!(dia >= 1 && dia <= 28)) return 'El día tiene que estar entre 1 y 28.';
      if (!isDate(desde)) return 'Pon desde cuándo.';
      if (hasta && (!isDate(hasta) || hasta < desde)) return 'Revisa la fecha de «Hasta».';
      fo.plan = { imp: red2(imp), dia, desde, hasta: hasta || null, saltar: p ? p.saltar : [] };
      const n = generarPlanes(); resolver(); save(); render();
      toast(n ? 'Aportación periódica guardada: ' + n + (n > 1 ? ' compras apuntadas' : ' compra apuntada') : 'Aportación periódica guardada'); setTimeout(loadVivo, 50);
    });
}

function sheetCarts() {
  openSheet('Carteras',
    '<div class="form"><p class="sub" style="margin:0">Una cartera por plataforma (MyInvestor, Trade Republic, cripto…). Cambia su nombre, bórrala o crea una nueva. El fondo de emergencia mejor no lo apuntes aquí: no es inversión y te estropearía la rentabilidad del total.</p>' +
    D.carteras.map(x => {
      const n = D.cartera.filter(r => r.c === x.id).length;
      return '<div class="fld"><label for="ct_' + esc(x.id) + '">' + (n ? n + ' mes' + (n === 1 ? '' : 'es') + ' apuntado' + (n === 1 ? '' : 's') : 'Sin meses apuntados') + '</label><div style="display:flex;gap:8px"><input id="ct_' + esc(x.id) + '" name="n_' + esc(x.id) + '" maxlength="30" autocomplete="off" style="flex:1" value="' + esc(x.nombre) + '">' +
        (D.carteras.length > 1 ? '<button type="button" class="btn sm danger" data-act="sheetDel" data-kind="cart" data-id="' + esc(x.id) + '">Borrar</button>' : '') + '</div>' +
        (n && D.carteras.length > 1 ? '<span class="help">Si la borras, también se borran sus ' + n + ' mes' + (n === 1 ? '' : 'es') + '.</span>' : '') + '</div>';
    }).join('') +
    '<div class="fld"><label for="ctNueva">Nueva cartera</label><input id="ctNueva" name="nueva" maxlength="30" autocomplete="off" placeholder="Trade Republic"></div>' +
    actions('', 'Guardar') + '</div>',
    fd => {
      const names = D.carteras.map(x => [x, String(fd.get('n_' + x.id) || '').trim()]);
      if (names.some(a => !a[1])) return 'Ninguna cartera puede quedarse sin nombre.';
      const nueva = String(fd.get('nueva') || '').trim();
      const all = names.map(a => a[1].toLowerCase()).concat(nueva ? [nueva.toLowerCase()] : []);
      if (new Set(all).size !== all.length) return 'Hay dos carteras con el mismo nombre.';
      names.forEach(a => { a[0].nombre = a[1].slice(0, 30); });
      if (nueva) { const x = { id: 'c_' + uid(), nombre: nueva.slice(0, 30) }; D.carteras.push(x); ui.cart = x.id; }
      save(); render(); toast(nueva ? 'Cartera creada' : 'Carteras guardadas');
    });
}

function sheetSecs() {
  openSheet('Secciones de seguimiento',
    '<div class="form"><p class="sub" style="margin:0">Cambia el nombre de una sección, bórrala o crea una nueva (por ejemplo, Cripto).</p>' +
    D.secciones.map(x => {
      const n = D.seg.filter(p => p.tipo === x.id).length;
      return '<div class="fld"><label for="sc_' + esc(x.id) + '">' + (n ? n + ' posición' + (n === 1 ? '' : 'es') : 'Sin posiciones') + '</label><div style="display:flex;gap:8px"><input id="sc_' + esc(x.id) + '" name="n_' + esc(x.id) + '" maxlength="30" autocomplete="off" style="flex:1" value="' + esc(x.nombre) + '">' +
        (D.secciones.length > 1 ? '<button type="button" class="btn sm danger" data-act="sheetDel" data-kind="sec" data-id="' + esc(x.id) + '">Borrar</button>' : '') + '</div>' +
        (n && D.secciones.length > 1 ? '<span class="help">Si la borras, también se borran sus ' + n + ' posición' + (n === 1 ? '' : 'es') + '.</span>' : '') + '</div>';
    }).join('') +
    '<div class="fld"><label for="scNueva">Nueva sección</label><input id="scNueva" name="nueva" maxlength="30" autocomplete="off" placeholder="Cripto"></div>' +
    actions('', 'Guardar') + '</div>',
    fd => {
      const names = D.secciones.map(x => [x, String(fd.get('n_' + x.id) || '').trim()]);
      if (names.some(a => !a[1])) return 'Ninguna sección puede quedarse sin nombre.';
      const nueva = String(fd.get('nueva') || '').trim();
      const all = names.map(a => a[1].toLowerCase()).concat(nueva ? [nueva.toLowerCase()] : []);
      if (new Set(all).size !== all.length) return 'Hay dos secciones con el mismo nombre.';
      names.forEach(a => { a[0].nombre = a[1].slice(0, 30); });
      if (nueva) { const x = { id: 's_' + uid(), nombre: nueva.slice(0, 30) }; D.secciones.push(x); ui.segTipo = x.id; }
      save(); render(); toast(nueva ? 'Sección creada' : 'Secciones guardadas');
    });
}

function sheetPrecios() {
  const items = D.seg.filter(p => p.tipo === ui.segTipo && !autoPrecio(p));
  openSheet('Actualizar precios',
    '<div class="form"><p class="sub" style="margin:0">Pon el precio de hoy de cada uno. Déjalo vacío si no lo sabes. Las que tienen precio automático no salen aquí.</p>' +
    items.map(p => '<div class="pricerow"><div><b>' + esc(p.nombre) + '</b><small>' + (p.precioEntrada != null ? 'Entrada ' + eur(p.precioEntrada) : 'Sin precio de entrada') + '</small></div><input name="p_' + esc(p.id) + '" inputmode="decimal" autocomplete="off" aria-label="Precio actual de ' + esc(p.nombre) + '" placeholder="€" value="' + fmtIn(p.precioActual) + '"></div>').join('') +
    actions('', 'Guardar precios') + '</div>',
    fd => {
      for (const p of items) { const raw = fd.get('p_' + p.id); const n = num(raw); if (String(raw || '').trim() && (n == null || n < 0)) return 'Revisa el precio de ' + p.nombre + '.'; }
      items.forEach(p => { p.precioActual = num(fd.get('p_' + p.id)); });
      save(); render(); toast('Precios actualizados');
    });
}

function sheetObj(id) {
  const o = id ? D.objetivos.find(x => x.id === id) : null;
  const v = o || { nombre: '', meta: '', ahorrado: '', fecha: '' };
  openSheet(o ? 'Editar objetivo' : 'Nuevo objetivo',
    '<div class="form"><div class="fld"><label for="oNom">Nombre</label><input id="oNom" name="nombre" maxlength="60" autocomplete="off" placeholder="Colchón de emergencia" value="' + esc(v.nombre) + '"></div>' +
    '<div class="row2"><div class="fld"><label for="oMeta">Meta (€)</label><input id="oMeta" name="meta" inputmode="decimal" autocomplete="off" value="' + fmtIn(v.meta) + '"></div><div class="fld"><label for="oAh">Ya ahorrado (€)</label><input id="oAh" name="ahorrado" inputmode="decimal" autocomplete="off" placeholder="0" value="' + (o ? fmtIn(v.ahorrado) : '') + '"></div></div>' +
    '<div class="fld"><label for="oFecha">Fecha límite (opcional)</label><input id="oFecha" name="fecha" type="date" value="' + esc(v.fecha || '') + '"><span class="help">Con fecha, te digo cuánto tienes que ahorrar al mes.</span></div>' +
    actions(o ? delBtn('obj', id) : '', o ? 'Guardar' : 'Crear objetivo') + '</div>',
    fd => {
      const nombre = String(fd.get('nombre') || '').trim(), meta = num(fd.get('meta')), ah = fd.get('ahorrado') === '' ? 0 : num(fd.get('ahorrado')), f = fd.get('fecha');
      if (!nombre) return 'Ponle un nombre al objetivo.';
      if (!(meta > 0)) return 'La meta tiene que ser mayor que 0.';
      if (ah == null || ah < 0) return 'Revisa lo que llevas ahorrado.';
      const n = { id: o ? o.id : uid(), nombre: nombre.slice(0, 60), meta, ahorrado: ah, fecha: isDate(f) ? f : null };
      if (o) D.objetivos[D.objetivos.indexOf(o)] = n; else D.objetivos.push(n);
      save(); render(); toast(o ? 'Objetivo actualizado' : 'Objetivo creado');
    });
}

function sheetAportar(id) {
  const o = D.objetivos.find(x => x.id === id); if (!o) return;
  openSheet('Aportar a «' + o.nombre + '»',
    '<div class="form"><div class="fld amount"><label for="aCant">Cantidad (€)</label><input id="aCant" name="cant" inputmode="decimal" autocomplete="off" placeholder="0,00"></div>' +
    '<div class="fld"><div class="opts" role="radiogroup" aria-label="Acción">' + opt('modo', 'mas', true, 'Aportar') + opt('modo', 'menos', false, 'Retirar') + '</div></div>' +
    actions('', 'Guardar') + '</div>',
    fd => {
      const c = num(fd.get('cant')); if (!(c > 0)) return 'Pon una cantidad mayor que 0.';
      o.ahorrado = Math.max(0, Math.round((o.ahorrado + (fd.get('modo') === 'menos' ? -c : c)) * 100) / 100);
      save(); render(); toast(o.ahorrado >= o.meta ? '¡Objetivo conseguido!' : 'Guardado');
    });
  setTimeout(() => { const i = $('#aCant'); if (i) i.focus(); }, 60);
}

function sheetImport(data) {
  const c = cleanData(data), n = c.gastos.length + c.fondos.length + c.cartera.length + c.seg.length + c.objetivos.length;
  if (!n) { toast('Ese archivo no tiene datos de Centex'); return; }
  const have = D.gastos.length + D.fondos.length + D.seg.length + D.objetivos.length;
  openSheet('Importar datos',
    '<div class="form"><p style="margin:0;font-weight:600">El archivo trae <b>' + c.gastos.length + '</b> gastos, <b>' + c.fondos.length + '</b> fondos, <b>' + c.seg.length + '</b> posiciones y <b>' + c.objetivos.length + '</b> objetivos.</p>' +
    (have ? '<div class="fld"><span class="lb">¿Qué hacemos con lo que ya tienes?</span><div class="opts" role="radiogroup">' + opt('modo', 'combinar', true, 'Combinar') + opt('modo', 'reemplazar', false, 'Reemplazar todo') + '</div><span class="help">Combinar añade lo nuevo sin tocar lo que ya tienes.</span></div>' : '<input type="hidden" name="modo" value="reemplazar">') +
    actions('', 'Importar') + '</div>',
    fd => {
      if (fd.get('modo') === 'reemplazar') { D.gastos = c.gastos; D.habOff = c.habOff; D.habMan = c.habMan; D.cartera = c.cartera; D.carteras = c.carteras; D.fondos = c.fondos; D.seg = c.seg; D.secciones = c.secciones; D.objetivos = c.objetivos; }
      else {
        const has = (arr, id) => arr.some(x => x.id === id);
        c.gastos.forEach(x => { if (!has(D.gastos, x.id)) D.gastos.push(x); });
        D.habOff = cleanHabOff(D.habOff.concat(c.habOff));
        c.habMan.forEach(x => { if (!D.habMan.some(y => habKey(y) === habKey(x))) D.habMan.push(x); });
        c.secciones.forEach(x => { if (!D.secciones.some(y => y.id === x.id)) D.secciones.push(x); });
        c.seg.forEach(x => { if (!has(D.seg, x.id)) D.seg.push(x); });
        ensureSecs(D.secciones, D.seg);
        c.objetivos.forEach(x => { if (!has(D.objetivos, x.id)) D.objetivos.push(x); });
        c.carteras.forEach(x => { if (!D.carteras.some(y => y.id === x.id)) D.carteras.push(x); });
        c.fondos.forEach(x => { if (!D.fondos.some(y => y.id === x.id || (y.c === x.c && (x.isin ? y.isin === x.isin : normN(fNombre(y)) === normN(fNombre(x)))))) D.fondos.push(x); });
        c.cartera.forEach(x => { D.cartera = D.cartera.filter(y => !(y.mes === x.mes && y.c === x.c)); D.cartera.push(x); });
      }
      if (migrarFondos(D.fondos, D.cartera)) D.ajustes.avisoCompras = true;
      generarPlanes(); resolver(); setTimeout(loadVivo, 50);
      save(); render(); toast('Datos importados');
    });
}

// «¿Ideas o algún fallo?»: el mensaje se envía a Formspree, que lo reenvía al correo de Centex. Va con la versión de la app y el tipo de móvil,
// para entender los fallos; nunca con datos de la persona.
const VERSION_APP = '1.22';
const FORM_URL = 'https://formspree.io/f/mgaayjay';
function sheetContacto() {
  openSheet('¿Ideas o algún fallo?',
    '<div class="form"><div class="fld"><div class="opts" role="radiogroup" aria-label="Qué nos cuentas">' + opt('tipo', 'Idea', true, 'Una idea') + opt('tipo', 'Fallo', false, 'Un fallo') + opt('tipo', 'Otra cosa', false, 'Otra cosa') + '</div></div>' +
    '<div class="fld"><label for="ctMsg">Mensaje</label><textarea id="ctMsg" name="mensaje" maxlength="3000" placeholder="Si es un fallo, cuéntanos qué hacías y qué pasó."></textarea></div>' +
    '<div class="fld"><label for="ctMail">Tu correo (opcional)</label><input id="ctMail" name="email" type="email" maxlength="120" autocomplete="email" placeholder="Solo si quieres que te respondamos"></div>' +
    '<span class="help">Con el mensaje van la versión de la app y el tipo de móvil, para entender los fallos. Nunca tus datos.</span>' +
    actions('', 'Enviar') + '</div>',
    fd => {
      const mensaje = String(fd.get('mensaje') || '').trim(), email = String(fd.get('email') || '').trim(), tipo = String(fd.get('tipo') || 'Otra cosa');
      if (mensaje.length < 3) return 'Escribe tu mensaje.';
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'Ese correo no tiene buena pinta. Puedes dejarlo vacío.';
      const b = $('#sheetForm button[type="submit"]'); if (b) { b.disabled = true; b.textContent = 'Enviando…'; }
      fetch(FORM_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ _subject: 'Centex · ' + tipo, tipo, mensaje, email: email || undefined, version: VERSION_APP, movil: navigator.userAgent.slice(0, 200), app: matchMedia('(display-mode: standalone)').matches || navigator.standalone ? 'instalada' : 'navegador' }) })
        .then(r => { if (!r.ok) throw new Error(r.status); closeSheet(); toast('¡Gracias! Mensaje enviado'); })
        .catch(() => { if (b) { b.disabled = false; b.textContent = 'Enviar'; } sheetErr('No se ha podido enviar. Revisa tu conexión e inténtalo otra vez.'); });
      return '';   // la hoja se cierra cuando llega la respuesta
    });
  setTimeout(() => { const i = $('#ctMsg'); if (i) i.focus(); }, 60);
}
// «+» de Inicio: apuntar cualquier cosa. Arriba, los gastos habituales con un solo toque (se apuntan hoy, con «Deshacer»).
function sheetRapido() {
  const m = mk(todayISO()), hs = habituales().map(h => Object.assign(h, { n: h.xs.filter(x => mk(x.fecha) === m).length })).sort((a, b) => b.n - a.n || b.xs.length - a.xs.length).slice(0, 6);
  const opc = [['addGasto', 'receipt', 'Nuevo gasto', 'Cualquier cosa que hayas pagado'], ['addCompra', 'pie', 'Compra de un fondo', 'Una aportación o una venta en tu cartera'],
    D.objetivos.length ? ['aportarRapido', 'target', 'Aportar a un objetivo', 'Lo que has guardado para una meta'] : ['addObj', 'target', 'Crear un objetivo', 'Una meta de ahorro: un viaje, un colchón…']];
  openSheet('¿Qué quieres apuntar?',
    '<div class="form">' + (hs.length ? '<div class="fld"><span class="lb">Tus gastos habituales, con un toque</span><div class="chips">' + hs.map(h => '<button type="button" class="chip" style="text-transform:none" data-act="habYa" data-k="' + esc(h.k) + '">' + catIcon(h.cat, true) + ' ' + esc(h.desc) + ' · ' + eur(h.cant) + '</button>').join('') + '</div></div>' : '') +
    '<div class="list">' + opc.map(o => '<button type="button" class="item plain" style="grid-template-columns:auto 1fr" data-act="' + o[0] + '"><span class="badge" style="background:var(--surface2);color:var(--ink)">' + icon(o[1]) + '</span><span class="t"><b>' + o[2] + '</b><small>' + o[3] + '</small></span></button>').join('') + '</div></div>');
}
function sheetAportarRapido() {
  if (D.objetivos.length === 1) { sheetAportar(D.objetivos[0].id); return; }
  openSheet('¿A qué objetivo?', '<div class="form"><div class="list">' + D.objetivos.map(o => '<button type="button" class="item plain" data-act="aportar" data-id="' + esc(o.id) + '"><span class="t"><b>' + esc(o.nombre) + '</b><small>' + eur(o.ahorrado) + ' de ' + eur(o.meta, 0) + '</small></span><span class="r">' + Math.round(Math.min(100, (o.ahorrado / o.meta) * 100)) + ' %</span></button>').join('') + '</div></div>');
}
// Aviso con un botón (por ejemplo «Deshacer»); se va solo a los 5 segundos.
function toastAccion(m, act, id) { const t = $('#toast'); t.innerHTML = esc(m) + ' <button class="link" style="color:inherit;text-decoration:underline;margin-left:6px" data-act="' + act + '" data-id="' + esc(id) + '">Deshacer</button>'; t.style.display = 'block'; t.style.pointerEvents = 'auto'; clearTimeout(toastT); toastT = setTimeout(() => (t.style.display = 'none'), 5000); }
function sheetWipe() {
  openSheet('Borrar todo', '<div class="form"><p style="margin:0;font-weight:600">Se borrarán todos tus gastos, tu cartera, tu seguimiento y tus objetivos de este dispositivo. No se puede deshacer, salvo que tengas una copia de seguridad.</p>' +
    '<div class="sheet-actions"><button type="button" class="btn ghost" data-act="closeSheet">Cancelar</button><button type="button" class="btn danger" data-act="sheetDel" data-kind="all">Borrar todo</button></div></div>');
}

/* ---------- 7. eventos ---------- */
function download(name, text, type) {
  const b = new Blob([text], { type }), a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
function doDelete(kind, id) {
  if (kind === 'gasto') D.gastos = D.gastos.filter(x => x.id !== id);
  else if (kind === 'compra') { const [ff, cc] = String(id).split('|'), fo = D.fondos.find(x => x.id === ff); if (fo) { const c = fo.compras.find(x => x.id === cc); if (c && c.plan && fo.plan && !fo.plan.saltar.includes(c.plan)) fo.plan.saltar.push(c.plan); fo.compras = fo.compras.filter(x => x.id !== cc); } }
  else if (kind === 'plan') { const fo = D.fondos.find(x => x.id === id); if (fo) fo.plan = null; }
  else if (kind === 'fondo') { D.fondos = D.fondos.filter(x => x.id !== id); D.cartera.forEach(r => { if (r.ap) { r.ap = r.ap.filter(a => a.id !== id); if (!r.ap.length) delete r.ap; } }); }
  else if (kind === 'cart') { if (D.carteras.length <= 1) return; D.fondos = D.fondos.filter(x => x.c !== id); D.cartera = D.cartera.filter(x => x.c !== id); D.carteras = D.carteras.filter(x => x.id !== id); ui.cart = 'total'; }
  else if (kind === 'seg') D.seg = D.seg.filter(x => x.id !== id);
  else if (kind === 'obj') D.objetivos = D.objetivos.filter(x => x.id !== id);
  else if (kind === 'hab') D.habMan = D.habMan.filter(x => x.id !== id);
  else if (kind === 'sec') { if (D.secciones.length <= 1) return; D.seg = D.seg.filter(x => x.tipo !== id); D.secciones = D.secciones.filter(x => x.id !== id); }
  else if (kind === 'all') { const a = D.ajustes; D = blank(); D.ajustes = a; ui.inm = null; ui.escTipo = 'inv'; ui.cart = 'total'; try { localStorage.removeItem('centex.esc'); } catch (e) { /* nada */ } }
  save(); closeSheet(); render(); toast(kind === 'all' ? 'Todo borrado' : kind === 'sec' ? 'Sección borrada' : kind === 'cart' ? 'Cartera borrada' : 'Borrado');
}
const ACT = {
  fab() { const f = fabOf(route()); if (f) ACT[f[1]](); },
  addGasto() { sheetGasto(); }, addSeg() { sheetSeg(); }, addObj() { sheetObj(); },
  addCompra(el) { sheetCompra(null, el && el.dataset.f); }, editCompra(el) { sheetCompra(el.dataset.id, el.dataset.f); }, editPlan(el) { sheetPlan(el.dataset.f); },
  demoIn() { try { localStorage.setItem('centex.demo', JSON.stringify(demoData())); localStorage.setItem('centex.modo', 'demo'); } catch (e) { toast('No he podido abrir el modo de prueba'); return; } contar('modo-prueba'); location.hash = '#/inicio'; location.reload(); },
  demoOut() { try { localStorage.removeItem('centex.modo'); localStorage.removeItem('centex.demo'); } catch (e) { /* nada */ } location.hash = '#/inicio'; location.reload(); },
  contacto() { sheetContacto(); },
  rapido() { sheetRapido(); }, aportarRapido() { sheetAportarRapido(); },
  habYa(el) {
    const h = habituales().find(x => x.k === el.dataset.k); if (!h) return;
    const g = { id: uid(), fecha: todayISO(), desc: h.desc, cat: h.cat, cant: h.cant, pago: h.pago };
    D.gastos.push(g); save(); closeSheet(); render(); toastAccion(h.desc + ' (' + eur(h.cant) + ') apuntado', 'deshacerGasto', g.id);
  },
  deshacerGasto(el) { D.gastos = D.gastos.filter(x => x.id !== el.dataset.id); save(); render(); toast('Deshecho'); },
  cmpModo(el) { D.ajustes.cmpModo = el.dataset.v === 'activos' ? 'activos' : 'cartera'; save(); render(); loadVivo(); },
  libreAdd() { sheetLibreAdd(); }, libreElegir(el) { closeSheet(); libreMeter(el.dataset.q); },
  libreQuitar(el) { const L = libreCfg(); D.ajustes.libre = { qs: L.qs.filter(q => q !== el.dataset.q), per: L.per }; save(); render(); },
  librePer(el) { const L = libreCfg(); D.ajustes.libre = { qs: L.qs, per: el.dataset.r }; save(); render(); loadVivo(); },
  buscar() { sheetBuscar(); }, ficha(el) { sheetFicha(el.dataset.q); },
  fichaPer(el) { ui.fPer = el.dataset.r; const f = FICHAS.get(ui.fichaQ); if (f) { $('#sheetBody').innerHTML = fichaHTML(f); drawPrecio($('#chFicha'), f, fichaIni(f)); } },
  fichaSeguir(el) {
    const q = el.dataset.q, f = FICHAS.get(q); if (!f) return;
    if (D.seg.some(x => vKey(x.ticker) === q)) { closeSheet(); location.hash = '#/seguimiento'; return; }
    const tipo = isIsin(q) && D.secciones.some(x => x.id === 'fondo') ? 'fondo' : D.secciones.some(x => x.id === 'accion') ? 'accion' : D.secciones[0].id;
    D.seg.push({ id: uid(), tipo, grupo: 'Sin clasificar', nombre: f.nombre.slice(0, 80), ticker: q, web: '', fecha: todayISO(), precioEntrada: f.precios[f.ds[f.ds.length - 1]], precioActual: null, motivo: '' });
    ui.segTipo = tipo; save(); closeSheet(); location.hash = '#/seguimiento'; render(); toast('Añadido a Seguimiento, con el precio de hoy como entrada'); setTimeout(loadVivo, 50);
  },
  fichaComparar(el) { const L = libreCfg(), q = el.dataset.q; if (!L.qs.includes(q)) L.qs = L.qs.slice(0, 3).concat([q]); D.ajustes.libre = { qs: L.qs, per: L.per }; D.ajustes.cmpModo = 'activos'; ui.escTipo = 'cmp'; persistEsc(); save(); closeSheet(); location.hash = '#/escenarios'; render(); setTimeout(loadVivo, 50); },
  fichaTengo(el) {
    const q = el.dataset.q, f = FICHAS.get(q); let fo = D.fondos.find(x => x.isin === q);
    if (!fo) { const c = D.carteras.some(x => x.id === ui.cart) ? ui.cart : D.carteras[0].id; fo = { id: 'f_' + uid(), isin: q, nombre: (f ? f.nombre : q).slice(0, 60), c, compras: [], plan: null }; D.fondos.push(fo); save(); render(); setTimeout(loadVivo, 50); }
    sheetCompra(null, fo.id);
  },
  gVista(el) { D.ajustes.vista = el.dataset.v === 'eur' ? 'eur' : 'pct'; save(); render(); },
  avisoOk() { D.ajustes.avisoCompras = false; save(); render(); }, eRango(el) { ui[el.dataset.k === 'kRango' ? 'kRango' : 'eRango'] = el.dataset.r; render(); },
  editGasto(el) { sheetGasto(el.dataset.id); }, editSeg(el) { sheetSeg(el.dataset.id); },
  editObj(el) { sheetObj(el.dataset.id); }, aportar(el) { sheetAportar(el.dataset.id); }, precios() { sheetPrecios(); },
  goSettings() { location.hash = '#/ajustes'; }, closeSheet() { closeSheet(); }, wipe() { sheetWipe(); },
  gMes(el) { ui.gMes = el.dataset.m; render(); },
  addFondo() { sheetFondo(); }, editFondo(el) { sheetFondo(el.dataset.id); },
  habVer(el) { sheetHab(el.dataset.k); },
  habAdd(el) { const h = habituales().find(x => x.k === el.dataset.k); if (h) sheetGasto(null, { desc: h.desc, cat: h.cat, cant: h.cant, pago: h.pago }); },
  habOff(el) { if (!D.habOff.includes(el.dataset.k)) D.habOff.push(el.dataset.k); save(); render(); if (el.dataset.back) sheetHabEdit(); else closeSheet(); toast('Quitado de habituales'); },
  habOn(el) { D.habOff = D.habOff.filter(k => k !== el.dataset.k); save(); render(); sheetHabEdit(); toast('Vuelve a estar en habituales'); },
  habEdit() { sheetHabEdit(); },
  habForm(el) { sheetHabForm(el.dataset.id); },
  fillIsin(el) { const i = $('#fIsin'), n = $('#fNombre'); if (i) i.value = el.dataset.isin; if (n && !n.value.trim()) n.value = el.dataset.n; },
  cCart(el) { ui.cart = el.dataset.c; render(); window.scrollTo(0, 0); },
  addCart() { sheetCarts(); setTimeout(() => { const i = $('#ctNueva'); if (i) i.focus(); }, 60); }, editCarts() { sheetCarts(); },
  segTipo(el) { ui.segTipo = el.dataset.t; render(); },
  escTipo(el) { ui.escTipo = ['inm', 'cmp'].includes(el.dataset.t) ? el.dataset.t : 'inv'; persistEsc(); render(); },
  addSec() { sheetSecs(); setTimeout(() => { const i = $('#scNueva'); if (i) i.focus(); }, 60); }, editSecs() { sheetSecs(); },
  logos(el) { D.ajustes.logos = el.dataset.v === '1'; save(); render(); },
  tema(el) { D.ajustes.tema = el.dataset.v; save(); applyTheme(); render(); },
  pickFile() { $('#fileIn').value = ''; $('#fileIn').click(); },
  export() {
    download('centex-copia-' + todayISO() + '.json', JSON.stringify({ app: 'centex', version: 1, exportado: new Date().toISOString(), gastos: D.gastos, habOff: D.habOff, habMan: D.habMan, cartera: D.cartera, carteras: D.carteras, fondos: D.fondos, seg: D.seg, secciones: D.secciones, objetivos: D.objetivos }, null, 2), 'application/json');
    D.ajustes.ultimaCopia = todayISO(); save(); render(); toast('Copia descargada');
  },
  exportCsv() {
    if (!D.gastos.length) { toast('Aún no tienes gastos'); return; }
    const q = v => '"' + String(v).replace(/"/g, '""') + '"';
    const rows = D.gastos.slice().sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).map(g => [g.fecha, q(g.desc), g.cat, String(g.cant).replace('.', ','), g.pago].join(';'));
    download('centex-gastos-' + todayISO() + '.csv', '﻿Fecha;Descripción;Categoría;Cantidad (€);Forma de pago\n' + rows.join('\n'), 'text/csv');
    toast('CSV descargado');
  },
  sheetDel(el) {
    if (!el.dataset.sure) { el.dataset.sure = '1'; el.textContent = '¿Seguro? Toca otra vez'; setTimeout(() => { if (el.isConnected) { delete el.dataset.sure; el.textContent = el.dataset.kind === 'all' ? 'Borrar todo' : 'Borrar'; } }, 3500); return; }
    doDelete(el.dataset.kind, el.dataset.id);
  }
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el && ACT[el.dataset.act]) { e.preventDefault(); ACT[el.dataset.act](el, e); return; }
  if (e.target === $('#sheet')) closeSheet();
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'cmpA') { ui.cmpA = t.value; ui._cmpTouched = true; render(); }
  else if (t.id === 'cmpB') { ui.cmpB = t.value || null; ui._cmpTouched = true; render(); }
  else if (t.id === 'rDesde' || t.id === 'rHasta') rango();
  else if (t.name === 'cModo' && t.value === 'per') sheetPlan(($('#cFondo') || {}).value);
  else if (t.id === 'refSel') { if (t.value === '+') sheetRef(); else { D.ajustes.cmp = t.value; save(); render(); loadVivo(); } }
  else if (t.closest && t.closest('#compraForm')) compraCalc(t);
  else if (t.id === 'fileIn' && t.files && t.files[0]) {
    const f = t.files[0];
    if (f.size > 5e6) { toast('El archivo es demasiado grande'); return; }
    const rd = new FileReader();
    rd.onload = () => { try { sheetImport(JSON.parse(rd.result)); } catch (err) { toast('No he podido leer ese archivo'); } };
    rd.readAsText(f);
  }
});
document.addEventListener('input', e => {
  if (e.target.id === 'q') { ui.q = e.target.value; $('#gList').innerHTML = gListHTML(); }
  else if (e.target.closest && e.target.closest('#escForm')) { readEsc(); renderEsc(); }
  else if (e.target.closest && e.target.closest('#compraForm')) compraCalc(e.target);
});
// Al cambiar el reparto de % a € (o al revés), convierte lo ya escrito usando el valor de la cartera.
function rango() {
  const d = $('#rDesde').value, h = $('#rHasta').value, out = $('#rTotal');
  if (!d || !h) { out.textContent = 'Elige las dos fechas.'; return; }
  if (d > h) { out.textContent = 'La fecha de inicio es posterior a la final.'; return; }
  const l = D.gastos.filter(x => x.fecha >= d && x.fecha <= h), t = l.reduce((s, x) => s + x.cant, 0);
  out.innerHTML = 'Del ' + esc(dLabel(d)) + ' al ' + esc(dLabel(h)) + ': <b>' + eur(t) + '</b> en ' + l.length + ' gasto' + (l.length === 1 ? '' : 's');
}
$('#sheetForm').addEventListener('submit', e => {
  e.preventDefault();
  if (!sheetFn) return;
  const msg = sheetFn(new FormData(e.target));
  if (typeof msg === 'string') sheetErr(msg); else closeSheet();
});
$('#sheet').addEventListener('close', () => { sheetFn = null; });

const tip = $('#tip');
function showTip(e) {
  const t = e.target.closest && e.target.closest('[data-tip]');
  if (!t) { tip.style.display = 'none'; return; }
  const p = e.touches ? e.touches[0] : e;
  tip.textContent = t.getAttribute('data-tip'); tip.style.display = 'block';
  const w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = Math.max(8, Math.min(p.clientX + 14, innerWidth - w - 8)) + 'px';
  tip.style.top = Math.max(8, Math.min(p.clientY - h - 14 < 8 ? p.clientY + 18 : p.clientY - h - 14, innerHeight - h - 8)) + 'px';
}
document.addEventListener('mousemove', showTip);
document.addEventListener('touchstart', showTip, { passive: true });
let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(render, 150); });
// Contador de visitas anónimo (GoatCounter, sin cookies). Solo cuenta qué pantallas se abren, nunca datos.
function contar(evento) { try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count(evento ? { path: evento, event: true } : { path: '/' + route() }); } catch (e) { /* sin contador */ } }
window.addEventListener('hashchange', () => { window.scrollTo(0, 0); render(); contar(); });

/* ---------- 8. arranque ---------- */
function applyTheme() {
  const t = D.ajustes.tema, root = document.documentElement;
  if (t === 'claro') root.dataset.theme = 'light'; else if (t === 'oscuro') root.dataset.theme = 'dark'; else delete root.dataset.theme;
  requestAnimationFrame(() => { const c = getComputedStyle(root).getPropertyValue('--bg').trim(); if (c) $('#metaTheme').setAttribute('content', c); });
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

$('#navItems').innerHTML = NAV.map(n => '<a class="nav-link" data-r="' + n[0] + '" href="#/' + n[0] + '">' + icon(n[2]) + '<span>' + n[1] + '</span></a>').join('');
$('#gearTop').innerHTML = icon('sliders');
$('#lupaTop').innerHTML = icon('search');
$('#lupaSide').innerHTML = icon('search') + '<span>Buscar</span>';
$('#gearSide').innerHTML = icon('sliders') + '<span>Ajustes</span>';
$('#sheetX').innerHTML = icon('x');
$('#fabIc').innerHTML = icon('plus');

applyTheme();
if (D.ajustes.avisoCompras | generarPlanes() | resolver()) save();
render();
loadPrecios();
loadAcciones();
loadVivo();
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') return; if (generarPlanes() | resolver()) { save(); if (route() === 'cartera' && !document.querySelector('#sheet[open]')) render(); } loadVivo(); });
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
  // Cuando la versión nueva queda instalada, la app se recarga sola (si hay un formulario abierto, espera a que se cierre).
  // La primera vez que se instala no hace falta: no había versión anterior.
  const habiaSW = !!navigator.serviceWorker.controller; let recargando = false;
  const recargar = () => { if (recargando) return; recargando = true; location.reload(); };
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!habiaSW) return;
    if ($('#sheet').open) $('#sheet').addEventListener('close', recargar, { once: true }); else recargar();
  });
  navigator.serviceWorker.register('sw.js').then(reg => {
    // Si la app vuelve de segundo plano sin cerrarse, también mira si hay versión nueva.
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
}

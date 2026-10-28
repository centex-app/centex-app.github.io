// Centex · precios: programa para Cloudflare Workers que devuelve el precio de cada día de un fondo o una acción,
// buscándolo por ISIN o ticker en Yahoo Finance. Así la app tiene precios de cualquier activo, de cualquier persona,
// sin listas. Se pega tal cual en el editor de Cloudflare (Workers → Edit code) y se pulsa Deploy.
//
// Uso: https://<este-worker>.workers.dev/?q=ES0112611001&desde=2025-01-15
//   q      ISIN, ticker (TSLA) o ticker con la bolsa delante (BME:NXT)
//   desde  primer día que interesa (AAAA-MM-DD); sin él, el último mes
// Respuesta: {"q", "yahoo", "nombre", "moneda": "EUR"|"USD", "precios": {"AAAA-MM-DD": 12.34, ...}}
// Va en euros o dólares; si cotiza en otra moneda (libras, francos suizos…) se pasa a euros con el cambio de cada día.

const UA = 'Mozilla/5.0 (compatible; centex-precios)';
const ISIN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
const BOLSAS = { NASDAQ: '', NYSE: '', AMEX: '', NYSEARCA: '', BME: '.MC', LON: '.L', LSE: '.L', ETR: '.DE', XETRA: '.DE',
  FRA: '.F', EPA: '.PA', AMS: '.AS', EBR: '.BR', BIT: '.MI', SWX: '.SW', HKEX: '.HK', TSE: '.T', TSX: '.TO' };
const CENTIMOS = { GBp: ['GBP', 100], GBX: ['GBP', 100], ZAc: ['ZAR', 100], ILA: ['ILS', 100] };   // cotizan en céntimos de esa moneda

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: {
  'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*',
  'cache-control': status === 200 ? 'public, max-age=3600' : 'no-store' } });

async function yahoo(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('Yahoo Finance respondió ' + r.status);
  return r.json();
}
async function buscar(isin) {
  const j = await yahoo('https://query2.finance.yahoo.com/v1/finance/search?q=' + isin + '&quotesCount=5&newsCount=0');
  const q = ((j && j.quotes) || []).find(x => x.symbol);
  return q ? q.symbol : null;
}
async function cierres(simbolo, desde) {
  const p1 = Math.floor(Date.parse(desde + 'T00:00:00Z') / 1000) - 7 * 86400, p2 = Math.floor(Date.now() / 1000) + 86400;
  const j = await yahoo('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(simbolo) + '?interval=1d&period1=' + p1 + '&period2=' + p2);
  const r = j && j.chart && j.chart.result && j.chart.result[0];
  if (!r) return null;
  const off = r.meta.gmtoffset || 0, cl = ((r.indicators.quote || [])[0] || {}).close || [], ps = {};
  (r.timestamp || []).forEach((t, i) => { const c = cl[i]; if (c > 0 && c < 1e7) ps[new Date((t + off) * 1000).toISOString().slice(0, 10)] = c; });
  return { moneda: r.meta.currency || '', nombre: r.meta.longName || r.meta.shortName || simbolo, ps };
}

export default {
  async fetch(req) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET' } });
    const u = new URL(req.url), hoy = new Date().toISOString().slice(0, 10);
    const q = (u.searchParams.get('q') || '').trim().toUpperCase();
    let desde = u.searchParams.get('desde') || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || desde > hoy) desde = new Date(Date.now() - 31 * 864e5).toISOString().slice(0, 10);
    if (desde < '2000-01-01') desde = '2000-01-01';
    if (!/^[A-Z0-9.\-^=:]{1,24}$/.test(q)) return json({ error: 'Pon un ISIN o un ticker en ?q=' }, 400);
    try {
      let simbolo = q;
      if (q.includes(':')) { const [b, t] = q.split(':'); simbolo = t + (BOLSAS[b] || ''); }
      else if (ISIN.test(q)) simbolo = await buscar(q);
      if (!simbolo) return json({ error: 'No encuentro ' + q }, 404);
      const c = await cierres(simbolo, desde);
      if (!c || !Object.keys(c.ps).length) return json({ error: 'Sin precios para ' + q }, 404);
      let moneda = c.moneda, ps = c.ps;
      if (moneda !== 'EUR' && moneda !== 'USD') {
        const [base, f] = CENTIMOS[moneda] || [moneda, 1];
        const fx = await cierres(base + 'EUR=X', desde);
        if (!fx || !Object.keys(fx.ps).length) return json({ error: 'No puedo pasar ' + moneda + ' a euros' }, 502);
        const fd = Object.keys(fx.ps).sort(), out = {};
        for (const d of Object.keys(ps)) { let k = fd[0]; for (const x of fd) { if (x <= d) k = x; else break; } out[d] = ps[d] / f * fx.ps[k]; }
        ps = out; moneda = 'EUR';
      }
      for (const d in ps) ps[d] = Math.round(ps[d] * 1e4) / 1e4;
      return json({ q, yahoo: simbolo, nombre: c.nombre, moneda, precios: ps });
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, 502);
    }
  }
};

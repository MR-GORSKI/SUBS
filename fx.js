// fx.js — currency conversion via frankfurter.app (ECB rates, no API key).
// Caches rates per base currency in localStorage with a 1-hour TTL.

(function () {
  const TTL_MS = 60 * 60 * 1000; // 1 hour
  const KEY = (base) => `fx:rates:${base}:v1`;
  const SUPPORTED = ['EUR','USD','PLN','RUB','GBP','CHF','JPY'];

  // Frankfurter doesn't quote RUB anymore (sanctions). Fallback: pre-baked
  // approximate rate vs EUR, refreshed manually when needed. KPI math will
  // still work; user can always view per-sub price in its native ccy.
  const STATIC_FALLBACK = {
    base: 'EUR',
    rates: { EUR: 1, USD: 1.07, PLN: 4.30, RUB: 100, GBP: 0.85, CHF: 0.95, JPY: 170 },
    fetchedAt: 0,
  };

  const inFlight = new Map(); // base → Promise

  function readCache(base) {
    try {
      const raw = localStorage.getItem(KEY(base));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.rates) return null;
      return parsed;
    } catch { return null; }
  }

  function writeCache(base, payload) {
    try { localStorage.setItem(KEY(base), JSON.stringify(payload)); } catch {}
  }

  async function fetchRates(base) {
    // Frankfurter doesn't support RUB as base; pivot through EUR.
    const fetchBase = base === 'RUB' ? 'EUR' : base;
    const symbols = SUPPORTED.filter(c => c !== fetchBase && c !== 'RUB').join(',');
    const url = `https://api.frankfurter.app/latest?from=${fetchBase}&to=${symbols}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('FX fetch failed: ' + res.status);
    const json = await res.json();

    const rates = { [fetchBase]: 1, ...json.rates };
    // Inject RUB from static (Frankfurter doesn't quote it) — derive via EUR.
    if (!rates.RUB) {
      // fetchBase → EUR → RUB
      const eurPerBase = fetchBase === 'EUR' ? 1 : (1 / json.rates.EUR);
      rates.RUB = STATIC_FALLBACK.rates.RUB * eurPerBase;
    }

    const payload = { base: fetchBase, rates, fetchedAt: Date.now() };
    writeCache(fetchBase, payload);

    // If user asked for RUB base, convert all to base=RUB by inverting through fetchBase.
    if (base !== fetchBase) {
      const baseInFetch = rates[base];
      const inverted = {};
      for (const [k, v] of Object.entries(rates)) inverted[k] = v / baseInFetch;
      const wrapped = { base, rates: inverted, fetchedAt: Date.now() };
      writeCache(base, wrapped);
      return wrapped;
    }
    return payload;
  }

  async function ensure(base) {
    if (!SUPPORTED.includes(base)) base = 'EUR';
    const cached = readCache(base);
    if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached;

    if (inFlight.has(base)) return inFlight.get(base);
    const p = fetchRates(base).catch(err => {
      console.warn('FX fetch fallback to static:', err);
      // Build payload around static EUR rates
      if (base === 'EUR') return STATIC_FALLBACK;
      const baseInEur = STATIC_FALLBACK.rates[base];
      const rates = {};
      for (const [k, v] of Object.entries(STATIC_FALLBACK.rates)) rates[k] = v / baseInEur;
      return { base, rates, fetchedAt: Date.now() };
    }).finally(() => inFlight.delete(base));
    inFlight.set(base, p);
    return p;
  }

  // Synchronous convert. Requires `rates` (from ensure(base)) — base = display ccy.
  // amount in `from`, return amount in `base`.
  function convert(amount, from, ratesPayload) {
    if (!ratesPayload || !ratesPayload.rates) return amount;
    if (from === ratesPayload.base) return amount;
    const r = ratesPayload.rates[from];
    if (!r) return amount; // unknown ccy, pass through
    return amount / r;
  }

  window.fx = { ensure, convert, SUPPORTED };
})();

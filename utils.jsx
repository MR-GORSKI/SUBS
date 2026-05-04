// utils.jsx — date math + money + sample data

const ACCENTS = [
  'oklch(0.62 0.20 28)',   // red-orange
  'oklch(0.72 0.16 60)',   // amber
  'oklch(0.78 0.16 95)',   // yellow
  'oklch(0.68 0.18 145)',  // green
  'oklch(0.66 0.13 200)',  // teal-blue
  'oklch(0.58 0.20 260)',  // royal blue
  'oklch(0.58 0.22 305)',  // violet
  'oklch(0.62 0.22 350)',  // pink
];

function pad2(n) { return String(n).padStart(2, '0'); }

function ymd(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseISO(s) {
  // "YYYY-MM-DD"
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d, n) {
  // preserves day-of-month, clamps to month-end
  const y = d.getFullYear();
  const m = d.getMonth() + n;
  const day = d.getDate();
  const target = new Date(y, m, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target;
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function diffDays(a, b) {
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function monthsBetween(a, b) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function fmtMoney(n, currency = 'EUR') {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const fixed = abs.toFixed(abs % 1 === 0 ? 0 : 2);
  // thousand separator with thin space
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  const num = parts.join('.');

  // Legacy path: literal symbol like '\u20ac' passed in (back-compat).
  if (currency && !CURRENCY_SYMBOLS[currency]) {
    return `${sign}${currency}${num}`;
  }

  const sym = currencySymbol(currency);
  if (CURRENCY_POSITION[currency] === 'after') {
    return `${sign}${num} ${sym}`;
  }
  return `${sign}${sym}${num}`;
}

const CURRENCIES = ['EUR','USD','PLN','RUB','GBP','CHF','JPY'];

const CURRENCY_SYMBOLS = {
  EUR: '\u20ac', USD: '$', PLN: 'z\u0142', RUB: '\u20bd',
  GBP: '\u00a3', CHF: 'Fr', JPY: '\u00a5',
};

// Some symbols read better after the number.
const CURRENCY_POSITION = { PLN: 'after', CHF: 'after' };

function currencySymbol(code) {
  return CURRENCY_SYMBOLS[code] || code || '\u20ac';
}

function fmtDate(d) {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function fmtDateShort(d) {
  return `${pad2(d.getDate())} ${MONTH_NAMES[d.getMonth()]}`;
}

// Convert a subscription's price + period to monthly equivalent
function toMonthly(price, period) {
  if (period === 'year')  return price / 12;
  if (period === 'week')  return price * 52 / 12;
  return price; // month
}

function toYearly(price, period) {
  if (period === 'year') return price;
  if (period === 'week') return price * 52;
  return price * 12;
}

// Charge cadence in days/months: returns next charge dates from start up to (and including) horizon
function chargeDates(startISO, period, horizon) {
  const start = parseISO(startISO);
  const dates = [];
  let cursor = new Date(start);
  let i = 0;
  while (cursor <= horizon && i < 1000) {
    dates.push(new Date(cursor));
    if (period === 'year')  cursor = addMonths(cursor, 12);
    else if (period === 'week') cursor = addDays(cursor, 7);
    else cursor = addMonths(cursor, 1);
    i++;
  }
  return dates;
}

// Total spent so far (charges <= today, exclusive of future)
// closedISO: if present, no charges after that date count
function totalSpent(sub, today) {
  const start = parseISO(sub.start);
  const end = sub.closed ? parseISO(sub.closed) : today;
  if (today < start) return 0;
  const horizon = end < today ? end : today;
  if (horizon < start) return 0;
  const dates = chargeDates(sub.start, sub.period, horizon);
  // chargeDates includes the start itself as charge #1, which is correct
  return dates.length * sub.price;
}

// Next charge date (or null if closed/past)
function nextChargeAfter(sub, today) {
  if (sub.closed) {
    const closedAt = parseISO(sub.closed);
    if (closedAt < today) return null;
  }
  // Walk from start until we pass today
  const start = parseISO(sub.start);
  let cursor = new Date(start);
  let safety = 0;
  while (cursor < today && safety < 2000) {
    if (sub.period === 'year') cursor = addMonths(cursor, 12);
    else if (sub.period === 'week') cursor = addDays(cursor, 7);
    else cursor = addMonths(cursor, 1);
    safety++;
  }
  if (sub.closed) {
    const closedAt = parseISO(sub.closed);
    if (cursor > closedAt) return null;
  }
  return cursor;
}

// Build an [N x M] grid of column dates for the gantt header
function buildMonthAxis(scaleMonths, today) {
  // Center on today: show some past, some future
  const past = Math.floor(scaleMonths * 0.45);
  const future = scaleMonths - past;
  const start = startOfMonth(addMonths(today, -past));
  const months = [];
  for (let i = 0; i < scaleMonths; i++) {
    months.push(addMonths(start, i));
  }
  // Range end = first day of (last month + 1)
  const end = addMonths(start, scaleMonths);
  return { start, end, months, past, future };
}

// Position helpers — given a date, return [0, 1] within axis range
function posWithin(date, axis) {
  const total = axis.end - axis.start;
  const p = (date - axis.start) / total;
  return Math.max(0, Math.min(1, p));
}
function posUnclamped(date, axis) {
  const total = axis.end - axis.start;
  return (date - axis.start) / total;
}

// Sample data from user: Claude 12.04.2026 100€, YouTube 07.01.2025 10€, ChatGPT 10.06.2025 25€, MartiniAI 17.04.2026 50€
const SAMPLE_SUBS = [
  {
    id: 's1',
    name: 'YouTube Premium',
    price: 10,
    period: 'month',
    start: '2025-01-07',
    color: ACCENTS[0],
    closed: null,
  },
  {
    id: 's2',
    name: 'ChatGPT Plus',
    price: 25,
    period: 'month',
    start: '2025-06-10',
    color: ACCENTS[3],
    closed: null,
  },
  {
    id: 's3',
    name: 'Claude Pro',
    price: 100,
    period: 'month',
    start: '2026-04-12',
    color: ACCENTS[5],
    closed: null,
  },
  {
    id: 's4',
    name: 'Martini AI',
    price: 50,
    period: 'month',
    start: '2026-04-17',
    color: ACCENTS[6],
    closed: null,
  },
];

// Expose for other Babel scripts
Object.assign(window, {
  ACCENTS,
  pad2, ymd, parseISO,
  startOfMonth, addMonths, addDays, diffDays, monthsBetween,
  MONTH_NAMES,
  CURRENCIES, CURRENCY_SYMBOLS, currencySymbol,
  fmtMoney, fmtDate, fmtDateShort,
  toMonthly, toYearly,
  chargeDates, totalSpent, nextChargeAfter,
  buildMonthAxis, posWithin, posUnclamped,
  SAMPLE_SUBS,
});

// Exchange rates from Frankfurter (https://frankfurter.dev).
// v2 blends several central banks, so it covers AED and other currencies the
// ECB doesn't publish. v1 is ECB-only but is kept as a fallback.

const V2 = "https://api.frankfurter.dev/v2";
const V1 = "https://api.frankfurter.app";

// Rates are published once per working day; an hour avoids refetching on every
// currency switch without ever showing badly stale numbers.
const TTL = 60 * 60 * 1000;

const rateRequests = new Map();
let currencyRequest = null;

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return res.json();
}

async function fetchRates(base) {
  try {
    const rows = await getJSON(`${V2}/rates?base=${base}`);
    const rates = { [base]: 1 };
    for (const row of rows) rates[row.quote] = row.rate;
    return { date: rows[0]?.date, rates };
  } catch (err) {
    const body = await getJSON(`${V1}/latest?from=${base}`);
    return { date: body.date, rates: { ...body.rates, [base]: 1 } };
  }
}

export function ratesFor(base) {
  const cached = rateRequests.get(base);
  if (cached && Date.now() - cached.at < TTL) return cached.promise;

  const promise = fetchRates(base);
  rateRequests.set(base, { at: Date.now(), promise });
  // A failed request shouldn't be cached for the full hour.
  promise.catch(() => rateRequests.delete(base));
  return promise;
}

export async function convert(amount, from, to) {
  if (from === to) return amount;
  const { rates } = await ratesFor(from);
  if (rates[to] == null) throw new Error(`No ${from} → ${to} rate`);
  return amount * rates[to];
}

export function currencies() {
  currencyRequest ??= getJSON(`${V2}/currencies`)
    .then((list) =>
      list
        .map((c) => ({ code: c.iso_code, name: c.name }))
        .sort((a, b) => a.code.localeCompare(b.code))
    )
    .catch(() =>
      getJSON(`${V1}/currencies`).then((names) =>
        Object.entries(names).map(([code, name]) => ({ code, name }))
      )
    );
  currencyRequest.catch(() => (currencyRequest = null));
  return currencyRequest;
}

const formatters = new Map();

// Cents on a 4-figure price are noise, so large amounts are shown whole.
export function formatMoney(amount, code) {
  const whole = Math.abs(amount) >= 1000;
  const key = `${code}:${whole}`;
  let fmt = formatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      ...(whole && { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    });
    formatters.set(key, fmt);
  }
  return fmt.format(amount);
}

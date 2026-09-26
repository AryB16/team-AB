import { listings } from "./listings.js";
import { ratesFor, currencies, formatMoney } from "./money.js";

const list = document.getElementById("listings");
const picker = document.getElementById("currency");
const note = document.getElementById("rate-note");

const STORAGE_KEY = "display-currency";
const FALLBACK_CODES = ["AED", "EUR", "GBP", "INR", "USD"];

function savedCurrency() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveCurrency(code) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {}
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

function row(item, shown) {
  const li = document.createElement("li");
  li.className = "listing";

  const converted = shown && shown.code !== item.currency;
  li.innerHTML = `
    <div class="listing-main">
      <h2 class="listing-title"></h2>
      <p class="listing-meta"></p>
    </div>
    <div class="listing-price">
      <span class="price"></span>
      ${converted ? `<span class="price-original"></span>` : ""}
    </div>`;

  li.querySelector(".listing-title").textContent = item.title;
  li.querySelector(".listing-meta").textContent =
    `${item.seller} · ${item.where} · ${dateFmt.format(new Date(item.posted))}`;

  const price = li.querySelector(".price");
  if (converted) {
    price.textContent = `≈ ${formatMoney(shown.amount, shown.code)}`;
    li.querySelector(".price-original").textContent = formatMoney(item.price, item.currency);
  } else {
    price.textContent = formatMoney(item.price, item.currency);
  }
  return li;
}

let renderId = 0;

async function render(code) {
  const id = ++renderId;
  list.setAttribute("aria-busy", "true");
  let rates = null;
  try {
    rates = await ratesFor(code);
    if (id !== renderId) return;
    note.textContent = `Converted at ${rates.date} reference rates (Frankfurter). Sellers set prices in their own currency.`;
    note.classList.remove("is-error");
  } catch {
    if (id !== renderId) return;
    note.textContent = "Couldn't reach the exchange-rate service, so prices are shown in the seller's currency.";
    note.classList.add("is-error");
  }

  // Rates are fetched with the display currency as base, so one request
  // covers every listing: price in `code` = price / rate(code → source).
  const rows = listings.map((item) => {
    const rate = rates?.rates[item.currency];
    const shown = rate ? { code, amount: item.price / rate } : null;
    return row(item, shown);
  });

  list.replaceChildren(...rows);
  list.removeAttribute("aria-busy");
}

function fillPicker(options, selected) {
  picker.replaceChildren(
    ...options.map(({ code, name }) => {
      const opt = new Option(name ? `${code} — ${name}` : code, code);
      opt.selected = code === selected;
      return opt;
    })
  );
}

async function init() {
  const initial = savedCurrency() || "AED";
  fillPicker(FALLBACK_CODES.map((code) => ({ code })), initial);
  render(initial);

  picker.addEventListener("change", () => {
    saveCurrency(picker.value);
    render(picker.value);
  });

  try {
    fillPicker(await currencies(), picker.value);
  } catch {
    // The short fallback list is already in place.
  }
}

init();

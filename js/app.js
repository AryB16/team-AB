import { allListings, addListing, CATEGORIES } from "./store.js";
import { ratesFor, currencies, formatMoney } from "./money.js";

const $ = (id) => document.getElementById(id);
const list = $("listings");
const picker = $("currency");
const note = $("rate-note");
const search = $("search");
const categoryFilter = $("category-filter");
const form = $("post-form");
const formError = $("form-error");
const fields = form.elements;

const STORAGE_KEY = "display-currency";
const FALLBACK_CODES = ["AED", "EUR", "GBP", "INR", "USD"];

const state = {
  display: readPref() || "AED",
  rates: null,
  query: "",
  category: "",
};

function readPref() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writePref(code) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {}
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

function row(item) {
  const li = document.createElement("li");
  li.className = "listing";

  // Rates are fetched with the display currency as base, so one request
  // covers every listing: price in display = price / rate(display → source).
  const rate = state.rates?.[item.currency];
  const converted = rate && item.currency !== state.display;

  li.innerHTML = `
    <div class="listing-main">
      <h3 class="listing-title"></h3>
      <p class="listing-meta"><span class="tag"></span> <span class="posted"></span></p>
    </div>
    <div class="listing-price">
      <span class="price"></span>
      ${converted ? `<span class="price-original"></span>` : ""}
    </div>`;

  li.querySelector(".listing-title").textContent = item.title;
  li.querySelector(".tag").textContent = item.category;
  li.querySelector(".posted").textContent = dateFmt.format(new Date(item.posted));

  const price = li.querySelector(".price");
  if (converted) {
    price.textContent = `≈ ${formatMoney(item.price / rate, state.display)}`;
    li.querySelector(".price-original").textContent = formatMoney(item.price, item.currency);
  } else {
    price.textContent = formatMoney(item.price, item.currency);
  }
  return li;
}

function renderList() {
  const query = state.query.trim().toLowerCase();
  const shown = allListings().filter(
    (item) =>
      (!state.category || item.category === state.category) &&
      (!query || item.title.toLowerCase().includes(query))
  );

  list.replaceChildren(...shown.map(row));
  $("empty").hidden = shown.length > 0;
  $("count").textContent = `${shown.length} ${shown.length === 1 ? "listing" : "listings"}`;
}

let rateRequest = 0;

async function loadRates() {
  const id = ++rateRequest;
  list.setAttribute("aria-busy", "true");
  try {
    const { date, rates } = await ratesFor(state.display);
    if (id !== rateRequest) return;
    state.rates = rates;
    note.textContent = `Converted at ${date} reference rates via Frankfurter. Sellers set prices in their own currency.`;
    note.classList.remove("is-error");
  } catch {
    if (id !== rateRequest) return;
    state.rates = null;
    note.textContent = "Couldn't reach the exchange-rate service, so prices are shown in the seller's currency.";
    note.classList.add("is-error");
  }
  list.removeAttribute("aria-busy");
  renderList();
}

function fillSelect(select, options, selected) {
  select.replaceChildren(
    ...options.map(({ value, label }) => {
      const opt = new Option(label, value);
      opt.selected = value === selected;
      return opt;
    })
  );
}

function fillCurrencySelects(codes) {
  const options = codes.map(({ code, name }) => ({ value: code, label: name ? `${code} — ${name}` : code }));
  fillSelect(picker, options, state.display);
  fillSelect(fields.currency, codes.map(({ code }) => ({ value: code, label: code })), fields.currency.value || state.display);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = fields.title.value.trim();
  const price = Number(fields.price.value);

  let problem = "";
  if (!title) problem = "Give the listing a title.";
  else if (fields.price.value === "" || !Number.isFinite(price) || price < 0) problem = "Enter a price of 0 or more.";
  else if (!fields.category.value) problem = "Pick a category.";

  formError.textContent = problem;
  if (problem) return;

  addListing({ title, price, currency: fields.currency.value, category: fields.category.value });
  fields.title.value = "";
  fields.price.value = "";
  fields.title.focus();

  // Show the new listing even if the current filter would hide it.
  state.category = "";
  state.query = "";
  categoryFilter.value = "";
  search.value = "";
  renderList();
});

search.addEventListener("input", () => {
  state.query = search.value;
  renderList();
});

categoryFilter.addEventListener("change", () => {
  state.category = categoryFilter.value;
  renderList();
});

picker.addEventListener("change", () => {
  state.display = picker.value;
  writePref(state.display);
  loadRates();
});

async function init() {
  fillSelect(
    categoryFilter,
    [{ value: "", label: "All categories" }, ...CATEGORIES.map((c) => ({ value: c, label: c }))],
    ""
  );
  fillSelect(
    fields.category,
    [{ value: "", label: "Choose…" }, ...CATEGORIES.map((c) => ({ value: c, label: c }))],
    ""
  );
  fillCurrencySelects(FALLBACK_CODES.map((code) => ({ code })));

  renderList();
  loadRates();

  try {
    fillCurrencySelects(await currencies());
  } catch {
    // The short fallback list is already in place.
  }
}

init();

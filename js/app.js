import { allListings, addListing, CATEGORIES } from "./store.js";
import { ratesFor, currencies, formatMoney } from "./money.js";
import { categoryIcon } from "./icons.js";

const $ = (id) => document.getElementById(id);
const grid = $("listings");
const picker = $("currency");
const note = $("rate-note");
const search = $("search");
const sort = $("sort");
const chips = $("chips");
const dialog = $("post-dialog");
const form = $("post-form");
const fields = form.elements;
const formError = $("form-error");

const STORAGE_KEY = "display-currency";
const FALLBACK_CODES = ["AED", "EUR", "GBP", "INR", "USD"];

const state = {
  display: readPref() || "AED",
  rates: null,
  query: "",
  category: "",
  sort: "new",
  justPosted: null,
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

// Rates are fetched with the display currency as base, so one request covers
// every listing: price in display = price / rate(display → source).
function inDisplay(item) {
  if (item.currency === state.display) return item.price;
  const rate = state.rates?.[item.currency];
  return rate ? item.price / rate : null;
}

function card(item) {
  const li = document.createElement("li");
  li.className = "card";
  li.dataset.category = item.category;
  if (item.id === state.justPosted) li.classList.add("is-new");

  const amount = inDisplay(item);
  const converted = amount != null && item.currency !== state.display;

  li.innerHTML = `
    <div class="card-art">${categoryIcon(item.category)}</div>
    <div class="card-body">
      <p class="card-meta"><span class="card-category"></span><span class="card-date"></span></p>
      <h3 class="card-title"></h3>
      <p class="card-price">
        <span class="price"></span>
        ${converted ? `<span class="price-original"></span>` : ""}
      </p>
    </div>`;

  li.querySelector(".card-category").textContent = item.category;
  li.querySelector(".card-date").textContent = dateFmt.format(new Date(item.posted));
  li.querySelector(".card-title").textContent = item.title;

  const price = li.querySelector(".price");
  if (converted) {
    price.textContent = formatMoney(amount, state.display);
    price.title = "Converted at today's reference rate";
    li.querySelector(".price-original").textContent = `${formatMoney(item.price, item.currency)} listed`;
  } else {
    price.textContent = formatMoney(item.price, item.currency);
  }
  return li;
}

function visibleListings() {
  const query = state.query.trim().toLowerCase();
  const shown = allListings().filter(
    (item) =>
      (!state.category || item.category === state.category) &&
      (!query || item.title.toLowerCase().includes(query))
  );

  if (state.sort !== "new") {
    // Without rates, mixed currencies can't be compared, so fall back to raw numbers.
    const value = (item) => inDisplay(item) ?? item.price;
    const dir = state.sort === "low" ? 1 : -1;
    shown.sort((a, b) => dir * (value(a) - value(b)));
  }
  return shown;
}

function render() {
  const shown = visibleListings();
  grid.replaceChildren(...shown.map(card));
  $("empty").hidden = shown.length > 0;

  const all = allListings();
  $("fact-count").textContent = all.length;
  $("fact-categories").textContent = new Set(all.map((item) => item.category)).size;
  $("fact-currency").textContent = state.display;

  for (const chip of chips.children) {
    chip.setAttribute("aria-checked", String(chip.dataset.value === state.category));
  }
}

let rateRequest = 0;

async function loadRates() {
  const id = ++rateRequest;
  grid.setAttribute("aria-busy", "true");
  try {
    const { date, rates } = await ratesFor(state.display);
    if (id !== rateRequest) return;
    state.rates = rates;
    const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(new Date(date));
    note.textContent = `Prices converted to ${state.display} at the ${day} reference rate. Sellers' original prices are shown underneath.`;
    note.classList.remove("is-error");
  } catch {
    if (id !== rateRequest) return;
    state.rates = null;
    note.textContent = "The exchange-rate service isn't responding, so prices are shown in each seller's own currency.";
    note.classList.add("is-error");
  }
  grid.removeAttribute("aria-busy");
  render();
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
  fillSelect(picker, codes.map(({ code, name }) => ({ value: code, label: name ? `${code} · ${name}` : code })), state.display);
  fillSelect(fields.currency, codes.map(({ code }) => ({ value: code, label: code })), fields.currency.value || state.display);
}

function buildChips() {
  const options = [{ value: "", label: "All" }, ...CATEGORIES.map((c) => ({ value: c, label: c }))];
  chips.replaceChildren(
    ...options.map(({ value, label }) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.setAttribute("role", "radio");
      chip.dataset.value = value;
      chip.textContent = label;
      chip.addEventListener("click", () => {
        state.category = value;
        render();
      });
      return chip;
    })
  );
}

function buildCategoryOptions() {
  $("category-options").replaceChildren(
    ...CATEGORIES.map((c) => {
      const label = document.createElement("label");
      label.className = "category-option";
      label.innerHTML = `<input type="radio" name="category" value="${c}">${categoryIcon(c)}<span>${c}</span>`;
      return label;
    })
  );
}

function openPost() {
  formError.textContent = "";
  fields.currency.value = state.display;
  dialog.showModal();
  fields.title.focus();
}

function closePost() {
  dialog.close();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = fields.title.value.trim();
  const price = Number(fields.price.value);
  const category = fields.category.value;

  let problem = "";
  if (!title) problem = "Give the listing a title.";
  else if (fields.price.value === "" || !Number.isFinite(price) || price < 0) problem = "Enter a price of 0 or more.";
  else if (!category) problem = "Pick a category.";

  formError.textContent = problem;
  if (problem) return;

  const item = addListing({ title, price, currency: fields.currency.value, category });
  form.reset();
  closePost();

  // Clear filters so the new listing is guaranteed to be visible at the top.
  Object.assign(state, { category: "", query: "", sort: "new", justPosted: item.id });
  search.value = "";
  sort.value = "new";
  render();
  grid.firstElementChild?.scrollIntoView({ behavior: "smooth", block: "center" });
});

form.addEventListener("input", () => {
  formError.textContent = "";
});

$("open-post").addEventListener("click", openPost);
$("close-post").addEventListener("click", closePost);
$("cancel-post").addEventListener("click", closePost);
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) closePost();
});

search.addEventListener("input", () => {
  state.query = search.value;
  render();
});

sort.addEventListener("change", () => {
  state.sort = sort.value;
  render();
});

picker.addEventListener("change", () => {
  state.display = picker.value;
  writePref(state.display);
  loadRates();
});

async function init() {
  buildChips();
  buildCategoryOptions();
  fillCurrencySelects(FALLBACK_CODES.map((code) => ({ code })));
  render();
  loadRates();

  try {
    fillCurrencySelects(await currencies());
  } catch {
    // The short fallback list is already in place.
  }
}

init();

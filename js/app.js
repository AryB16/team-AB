import { allListings, addListing, getListing, updateListing, CATEGORIES, CONDITIONS, STATUSES } from "./store.js";
import { ratesFor, currencies, formatMoney } from "./money.js";
import { categoryIcon } from "./icons.js";

const $ = (id) => document.getElementById(id);
const grid = $("listings");
const picker = $("currency");
const note = $("rate-note");
const search = $("search");
const sort = $("sort");
const chips = $("chips");
const postDialog = $("post-dialog");
const detailDialog = $("detail-dialog");
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
  openId: null,
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

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

function timeAgo(iso) {
  const minutes = Math.round((Date.now() - new Date(iso)) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return relative.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return relative.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 7) return relative.format(-days, "day");
  return dateFmt.format(new Date(iso));
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

// Rates are fetched with the display currency as base, so one request covers
// every listing: price in display = price / rate(display → source).
function inDisplay(item) {
  if (item.currency === state.display) return item.price;
  const rate = state.rates?.[item.currency];
  return rate ? item.price / rate : null;
}

function prices(item) {
  const amount = inDisplay(item);
  if (amount == null || item.currency === state.display) {
    return { main: formatMoney(item.price, item.currency), original: "" };
  }
  return { main: formatMoney(amount, state.display), original: formatMoney(item.price, item.currency) };
}

function statusBadge(status) {
  if (status === "available") return "";
  return `<span class="badge badge-${status}">${STATUSES[status]}</span>`;
}

function card(item) {
  const li = document.createElement("li");
  const { main, original } = prices(item);

  li.innerHTML = `
    <button type="button" class="card" data-id="${item.id}" data-category="${item.category}">
      <span class="card-art">${categoryIcon(item.icon ?? item.category)}</span>
      <span class="card-main">
        <span class="card-title"><span class="card-title-text"></span>${statusBadge(item.status)}</span>
        <span class="card-meta"><span class="avatar avatar-sm" aria-hidden="true"></span><span class="card-seller"></span><span class="card-when"></span></span>
      </span>
      <span class="card-price">
        <span class="price"></span>
        ${original ? `<span class="price-original"></span>` : ""}
      </span>
    </button>`;

  const button = li.firstElementChild;
  if (item.id === state.justPosted) button.classList.add("is-new");
  if (item.status === "sold") button.classList.add("is-sold");

  li.querySelector(".card-title-text").textContent = item.title;
  li.querySelector(".avatar").textContent = initials(item.seller);
  li.querySelector(".card-seller").textContent = item.seller;
  li.querySelector(".card-when").textContent = timeAgo(item.posted);
  li.querySelector(".price").textContent = main;
  if (original) li.querySelector(".price-original").textContent = original;
  return li;
}

function visibleListings() {
  const query = state.query.trim().toLowerCase();
  const shown = allListings().filter(
    (item) =>
      (!state.category || item.category === state.category) &&
      (!query || [item.title, item.description, item.location].join(" ").toLowerCase().includes(query))
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
  if (!shown.length) {
    const where = state.category ? ` in ${state.category}` : "";
    $("empty-text").textContent = state.query.trim()
      ? `No listings match “${state.query.trim()}”${where}.`
      : `Nothing${where} yet. Be the first to post one.`;
  }

  const available = allListings().filter((item) => item.status !== "sold").length;
  $("fact-count").textContent = `${available} available`;

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
    const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(date));
    note.textContent = `Prices in ${state.display} · ${day} rates`;
    note.classList.remove("is-error");
  } catch {
    if (id !== rateRequest) return;
    state.rates = null;
    note.textContent = "Rates unavailable, showing original prices";
    note.classList.add("is-error");
  }
  grid.removeAttribute("aria-busy");
  render();
  if (state.openId) fillDetail(getListing(state.openId));
}

/* Detail view */

function contactLink(item) {
  const first = item.seller.split(" ")[0];
  const message = `Hi ${first}, is your "${item.title}" still available?`;
  if (item.contact.method === "whatsapp") {
    const digits = item.contact.value.replace(/\D/g, "");
    return { href: `https://wa.me/${digits}?text=${encodeURIComponent(message)}`, label: "Message on WhatsApp" };
  }
  const subject = encodeURIComponent(`AB Marketplace: ${item.title}`);
  return { href: `mailto:${item.contact.value}?subject=${subject}&body=${encodeURIComponent(message)}`, label: "Email the seller" };
}

function fillDetail(item) {
  if (!item) return;
  const { main, original } = prices(item);
  const canSeeContact = item.mine || item.interested;

  const art = $("detail-art");
  art.dataset.category = item.category;
  art.innerHTML = categoryIcon(item.icon ?? item.category);

  $("detail-badges").innerHTML = `<span class="badge">${item.category}</span><span class="badge">${item.condition}</span>${statusBadge(item.status)}`;
  $("detail-title").textContent = item.title;
  $("detail-price").textContent = main;
  $("detail-original").textContent = original ? `${original} listed` : "";
  $("detail-description").textContent = item.description || "No description given.";
  $("detail-description").classList.toggle("is-empty", !item.description);
  $("detail-location").textContent = item.location;
  $("detail-posted").textContent = timeAgo(item.posted);
  $("detail-avatar").textContent = initials(item.seller);
  $("detail-seller").textContent = item.mine ? `${item.seller} (you)` : item.seller;
  $("detail-contact").textContent = canSeeContact
    ? item.contact.value
    : "Contact details appear once you say you're interested";

  const actions = $("detail-actions");
  actions.replaceChildren();

  if (item.mine) {
    const label = document.createElement("p");
    label.className = "actions-label";
    label.textContent = "Mark this listing as";
    const group = document.createElement("div");
    group.className = "segmented";
    for (const [value, text] of Object.entries(STATUSES)) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = text;
      button.setAttribute("aria-pressed", String(item.status === value));
      button.addEventListener("click", () => {
        updateListing(item.id, { status: value });
        fillDetail(getListing(item.id));
        render();
      });
      group.append(button);
    }
    actions.append(label, group);
    return;
  }

  if (item.status === "sold") {
    actions.innerHTML = `<button class="btn btn-primary btn-wide" type="button" disabled>Sold</button>`;
    return;
  }

  if (!item.interested) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-primary btn-wide";
    button.textContent = "I'm interested";
    button.addEventListener("click", () => {
      updateListing(item.id, { interested: true });
      fillDetail(getListing(item.id));
    });
    actions.append(button);
    if (item.status === "reserved") {
      const hint = document.createElement("p");
      hint.className = "actions-hint";
      hint.textContent = "Someone has reserved this, but you can ask to be next in line.";
      actions.append(hint);
    }
    return;
  }

  const { href, label } = contactLink(item);
  const link = document.createElement("a");
  link.className = "btn btn-primary btn-wide";
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = label;
  const hint = document.createElement("p");
  hint.className = "actions-hint";
  hint.textContent = `You've shown interest. Arrange the pickup at ${item.location} with ${item.seller.split(" ")[0]}.`;
  actions.append(link, hint);
}

function openDetail(id) {
  state.openId = id;
  fillDetail(getListing(id));
  detailDialog.showModal();
}

detailDialog.addEventListener("close", () => {
  state.openId = null;
});

grid.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (card) openDetail(card.dataset.id);
});

/* Post form */

function fillSelect(select, options, selected) {
  select.replaceChildren(
    ...options.map(({ value, label, title }) => {
      const opt = new Option(label, value);
      if (title) opt.title = title;
      opt.selected = value === selected;
      return opt;
    })
  );
}

// A closed <select> shows its selected option's text, so options carry the full
// name while the list is open and the selected one shrinks back to its code after.
function compact(select) {
  for (const opt of select.options) opt.textContent = opt.selected ? opt.value : opt.dataset.full;
}

function expand(select) {
  for (const opt of select.options) opt.textContent = opt.dataset.full;
}

function fillCurrencySelects(codes) {
  for (const [select, selected] of [
    [picker, state.display],
    [fields.currency, fields.currency.value || state.display],
  ]) {
    fillSelect(select, codes.map(({ code }) => ({ value: code, label: code })), selected);
    codes.forEach(({ code, name }, i) => {
      select.options[i].dataset.full = name ? `${code} — ${name}` : code;
    });
    compact(select);
  }
}

for (const select of [picker, fields.currency]) {
  select.addEventListener("mousedown", () => expand(select));
  select.addEventListener("touchstart", () => expand(select), { passive: true });
  select.addEventListener("keydown", (event) => {
    if ([" ", "Enter", "ArrowDown", "ArrowUp"].includes(event.key)) expand(select);
  });
  select.addEventListener("change", () => compact(select));
  select.addEventListener("blur", () => compact(select));
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

function buildFormOptions() {
  $("category-options").replaceChildren(
    ...CATEGORIES.map((c) => {
      const label = document.createElement("label");
      label.className = "category-option";
      label.innerHTML = `<input type="radio" name="category" value="${c}">${categoryIcon(c)}<span>${c}</span>`;
      return label;
    })
  );
  $("condition-options").replaceChildren(
    ...CONDITIONS.map((c) => {
      const label = document.createElement("label");
      label.innerHTML = `<input type="radio" name="condition" value="${c}"><span>${c}</span>`;
      return label;
    })
  );
}

function contactProblem(method, value) {
  if (!value) return "Add a way for buyers to reach you.";
  if (method === "whatsapp" && value.replace(/\D/g, "").length < 8) return "Enter a WhatsApp number with country code.";
  if (method === "email" && !/^\S+@\S+\.\S+$/.test(value)) return "Enter a valid email address.";
  return "";
}

fields.contactMethod.addEventListener("change", () => {
  const email = fields.contactMethod.value === "email";
  fields.contactValue.placeholder = email ? "you@example.com" : "+971 50 123 4567";
  fields.contactValue.inputMode = email ? "email" : "tel";
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = fields.title.value.trim();
  const price = Number(fields.price.value);
  const location = fields.location.value.trim();
  const seller = fields.seller.value.trim();
  const contactValue = fields.contactValue.value.trim();

  let problem = "";
  if (!title) problem = "Give the listing a title.";
  else if (fields.price.value === "" || !Number.isFinite(price) || price < 0) problem = "Enter a price of 0 or more.";
  else if (!fields.condition.value) problem = "Pick the condition.";
  else if (!fields.category.value) problem = "Pick a category.";
  else if (!location) problem = "Say where buyers can pick it up.";
  else if (!seller) problem = "Add your name so buyers know who they're meeting.";
  else problem = contactProblem(fields.contactMethod.value, contactValue);

  formError.textContent = problem;
  if (problem) return;

  const item = addListing({
    title,
    description: fields.description.value.trim(),
    price,
    currency: fields.currency.value,
    condition: fields.condition.value,
    category: fields.category.value,
    location,
    seller,
    contact: { method: fields.contactMethod.value, value: contactValue },
  });
  form.reset();
  postDialog.close();

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

$("open-post").addEventListener("click", () => {
  formError.textContent = "";
  fields.currency.value = state.display;
  compact(fields.currency);
  postDialog.showModal();
  fields.title.focus();
});

for (const dialog of [postDialog, detailDialog]) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.closest("[data-close]")) dialog.close();
  });
}

/* Filters */

search.addEventListener("input", () => {
  state.query = search.value;
  render();
});

sort.addEventListener("change", () => {
  state.sort = sort.value;
  render();
});

$("clear-filters").addEventListener("click", () => {
  Object.assign(state, { category: "", query: "" });
  search.value = "";
  render();
});

picker.addEventListener("change", () => {
  state.display = picker.value;
  writePref(state.display);
  loadRates();
});

async function init() {
  buildChips();
  buildFormOptions();
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

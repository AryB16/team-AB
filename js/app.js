import { allListings, addListing, getListing, updateListing, removeListing, CATEGORIES, CONDITIONS, STATUSES } from "./store.js";
import { ratesFor, currencies, formatMoney } from "./money.js";
import { categoryIcon } from "./icons.js";
import { shrinkPhoto } from "./photo.js";

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
const SAVED = "__saved";
const FLAG = `<svg class="flag" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V4M6 4h11l-2.5 4L17 12H6"/></svg>`;

// The data keeps its original values; only the words on screen follow the case-file theme.
const CASE_TYPES = {
  Books: "Documents",
  Electronics: "Digital devices",
  Appliances: "Equipment",
  Furniture: "Furnishings",
  "Dorm essentials": "Personal effects",
  Clothing: "Apparel",
  Stationery: "Office supplies",
  Other: "Unclassified",
};
const STATES = { New: "Pristine", "Like new": "Intact", Used: "Worn" };
const caseType = (category) => CASE_TYPES[category] ?? category;
const stateOf = (condition) => STATES[condition] ?? condition;

// A stable, official-looking file number derived from the listing id.
function caseNumber(id) {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return `AB-${1000 + ((h >>> 0) % 9000)}`;
}
// The currencies most visitors here actually use, pinned above the full list.
const POPULAR = ["AED", "INR", "USD", "EUR", "GBP"];
const FALLBACK_CODES = ["AED", "INR", "USD", "EUR", "GBP"];

const state = {
  display: readPref() || "AED",
  rates: null,
  query: "",
  category: "",
  sort: "new",
  justPosted: null,
  openId: null,
  editingId: null,
  photo: null,
  // Interest is kept for this visit only, so the contact reveal works every demo.
  interested: new Set(),
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
const fullDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

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

function fillArt(el, item) {
  const showIcon = () => {
    el.innerHTML = categoryIcon(item.icon ?? item.category);
    el.classList.remove("has-photo", "is-loading");
  };
  if (!item.photo) return showIcon();

  const img = document.createElement("img");
  img.alt = `Exhibit photo: ${item.title}`;
  img.decoding = "async";
  el.classList.add("has-photo", "is-loading");
  img.addEventListener("load", () => el.classList.remove("is-loading"), { once: true });
  img.addEventListener("error", showIcon, { once: true });
  img.src = item.photo;
  el.replaceChildren(img);
}

function statusBadge(status) {
  if (status === "available") return "";
  return `<span class="badge badge-${status}">${STATUSES[status]}</span>`;
}

function card(item) {
  const li = document.createElement("li");
  const { main, original } = prices(item);

  li.innerHTML = `
    <button type="button" class="card" data-id="${item.id}" data-category="${item.category}" data-case="${caseNumber(item.id)}">
      <span class="card-art"></span>
      <span class="card-main">
        <span class="card-case"></span>
        <span class="card-title"><span class="card-title-text"></span>${item.saved ? FLAG : ""}${statusBadge(item.status)}</span>
        <span class="card-facts"><span class="card-condition"></span><span class="card-where"></span></span>
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

  fillArt(li.querySelector(".card-art"), item);
  li.querySelector(".card-title-text").textContent = item.title;
  li.querySelector(".card-case").textContent = `Exhibit: ${item.exhibit || caseType(item.category)}`;
  li.querySelector(".card-condition").textContent = stateOf(item.condition);
  li.querySelector(".card-where").textContent = `Held at ${item.location}`;
  li.querySelector(".avatar").textContent = initials(item.seller);
  li.querySelector(".card-seller").textContent = `Off. ${item.seller}`;
  li.querySelector(".card-when").textContent = timeAgo(item.posted);
  li.querySelector(".price").textContent = main;
  if (original) li.querySelector(".price-original").textContent = original;
  return li;
}

function visibleListings(all) {
  const query = state.query.trim().toLowerCase();
  const shown = all.filter(
    (item) =>
      (!state.category ||
        (state.category === SAVED ? item.saved : item.category === state.category)) &&
      (!query || [item.title, item.exhibit, item.description, item.location].join(" ").toLowerCase().includes(query))
  );

  if (state.sort !== "new") {
    // Without rates, mixed currencies can't be compared, so fall back to raw numbers.
    const value = (item) => inDisplay(item) ?? item.price;
    const dir = state.sort === "low" ? 1 : -1;
    shown.sort((a, b) => dir * (value(a) - value(b)));
  }
  // Sold items stay findable but sink below everything still for sale (sort is stable).
  return shown.sort((a, b) => (a.status === "sold") - (b.status === "sold"));
}

function render() {
  const all = allListings();
  const shown = visibleListings(all);
  grid.replaceChildren(...shown.map(card));

  $("empty").hidden = shown.length > 0;
  if (!shown.length) {
    const saved = state.category === SAVED;
    const where = saved ? " among your flagged files" : state.category ? ` under ${caseType(state.category)}` : "";
    $("empty-text").textContent = state.query.trim()
      ? `No files match “${state.query.trim()}”${where}.`
      : saved
        ? "No flagged files yet. Open a case and tap Flag to keep it here."
        : `No evidence logged${where} yet.`;
  }

  const available = all.filter((item) => item.status !== "sold").length;
  const filtered = state.category || state.query.trim();
  $("fact-count").textContent = filtered
    ? `${shown.length} of ${all.length} files shown`
    : `${available} open ${available === 1 ? "case" : "cases"}`;

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
    note.textContent = `Assessed values in ${state.display} · ${day} exchange rates`;
    note.classList.remove("is-error");
  } catch {
    if (id !== rateRequest) return;
    state.rates = null;
    note.textContent = "Assessment service offline, showing declared values";
    note.classList.add("is-error");
  }
  grid.removeAttribute("aria-busy");
  render();
  if (state.openId) fillDetail(getListing(state.openId));
}

/* Detail view */

function contactLink(item) {
  const first = item.seller.split(" ")[0];
  const message = `Hi ${first}, I'd like to claim the "${item.title}" (case ${caseNumber(item.id)}). Is it still available?`;
  if (item.contact.method === "whatsapp") {
    const digits = item.contact.value.replace(/\D/g, "");
    return { href: `https://wa.me/${digits}?text=${encodeURIComponent(message)}`, label: "Message the officer on WhatsApp" };
  }
  const subject = encodeURIComponent(`Case ${caseNumber(item.id)}: ${item.title}`);
  return { href: `mailto:${item.contact.value}?subject=${subject}&body=${encodeURIComponent(message)}`, label: "Email the officer" };
}

function fillDetail(item) {
  if (!item) return;
  const { main, original } = prices(item);
  const interested = state.interested.has(item.id);

  $("detail-art").dataset.category = item.category;
  fillArt($("detail-window"), item);
  $("bag-case").textContent = caseNumber(item.id);
  $("bag-date").textContent = fullDate.format(new Date(item.posted));
  $("bag-officer").textContent = `Off. ${item.seller}`;
  fillCustody(item, interested);

  $("detail-case").textContent = `Case file ${caseNumber(item.id)}${item.exhibit ? ` · Exhibit: ${item.exhibit}` : ""}`;
  $("detail-badges").innerHTML = `<span class="badge">${caseType(item.category)}</span><span class="badge">${stateOf(item.condition)}</span>${statusBadge(item.status)}`;
  $("detail-title").textContent = item.title;
  $("detail-price").textContent = main;
  $("detail-original").textContent = original ? `${original} declared` : "";
  $("detail-description").textContent = item.description || "No notes on file.";
  $("detail-description").classList.toggle("is-empty", !item.description);
  $("detail-location").textContent = item.location;
  $("detail-avatar").textContent = initials(item.seller);
  $("detail-seller").textContent = `Reporting officer: ${item.seller}${item.mine ? " (you)" : ""}`;
  const via = item.contact.method === "whatsapp" ? "WhatsApp" : "email";
  const contact = $("detail-contact");
  if (item.mine) contact.textContent = item.contact.value;
  else if (interested) contact.textContent = `Clearance granted: reachable on ${via}`;
  else {
    // Blacked out like a redacted file until clearance is requested.
    contact.innerHTML = `<span class="redacted" aria-hidden="true">████████████████</span><span class="visually-hidden">Contact details redacted until you request clearance</span>`;
  }

  const actions = $("detail-actions");
  actions.replaceChildren();

  if (item.mine) {
    const label = document.createElement("p");
    label.className = "actions-label";
    label.textContent = "Update case status";
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
    const manage = document.createElement("div");
    manage.className = "detail-manage";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "btn btn-ghost";
    edit.textContent = "Amend record";
    edit.addEventListener("click", () => {
      detailDialog.close();
      openPostForm(item);
    });
    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn btn-ghost btn-danger";
    del.textContent = "Destroy record";
    // Two taps instead of a confirm() popup: the first arms it, the second deletes.
    del.addEventListener("click", () => {
      if (!del.classList.contains("is-armed")) {
        del.classList.add("is-armed");
        del.textContent = "Tap again to destroy";
        return;
      }
      removeListing(item.id);
      detailDialog.close();
      render();
    });
    manage.append(edit, del);
    actions.append(label, group, manage);
    return;
  }

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "btn btn-ghost btn-save";
  saveButton.setAttribute("aria-pressed", String(Boolean(item.saved)));
  saveButton.innerHTML = `${FLAG}<span>${item.saved ? "Flagged" : "Flag"}</span>`;
  saveButton.addEventListener("click", () => {
    updateListing(item.id, { saved: !item.saved });
    fillDetail(getListing(item.id));
    render();
  });
  const row = document.createElement("div");
  row.className = "detail-row";
  actions.append(row);

  if (item.status === "sold") {
    row.innerHTML = `<button class="btn btn-primary btn-wide" type="button" disabled>Case closed</button>`;
    row.append(saveButton);
    return;
  }

  if (!interested) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-primary btn-wide";
    button.textContent = "Request clearance";
    button.addEventListener("click", () => {
      state.interested.add(item.id);
      fillDetail(item);
    });
    row.append(button, saveButton);
    if (item.status === "reserved") {
      const hint = document.createElement("p");
      hint.className = "actions-hint";
      hint.textContent = "This case is under investigation, but you can still request clearance.";
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
  hint.textContent = `Clearance granted. Collect it from ${item.location} and ask for Officer ${item.seller.split(" ").at(-1)}.`;
  row.append(link, saveButton);
  actions.append(hint);
}

// The listing's status history, told as an evidence chain of custody.
function fillCustody(item, interested) {
  const sold = item.status === "sold";
  const steps = [{ label: "Logged", note: `${timeAgo(item.posted)} by Off. ${item.seller}`, done: true }];
  if (item.status === "reserved") {
    steps.push({ label: "Under investigation", note: "Another claimant has a hold on it", done: true });
  }
  steps.push({
    label: "Clearance requested",
    note: sold ? "Granted to a claimant" : interested ? "By you, during this visit" : item.mine ? "Waiting for a claimant" : "Not yet requested",
    done: sold || interested,
  });
  steps.push({ label: "Case closed", note: sold ? "Item released from the locker" : "Still held", done: sold });

  $("detail-custody").replaceChildren(
    ...steps.map(({ label, note, done }) => {
      const li = document.createElement("li");
      if (done) li.className = "is-done";
      const title = document.createElement("span");
      title.className = "step";
      title.textContent = label;
      const detail = document.createElement("span");
      detail.className = "step-note";
      detail.textContent = note;
      li.append(title, detail);
      return li;
    })
  );
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
    // Keep the current choice even if the list (e.g. the offline fallback) lacks it.
    const list = codes.some((c) => c.code === selected) ? codes : [...codes, { code: selected }];
    const option = ({ code, name }) => {
      const opt = new Option(code, code, false, code === selected);
      opt.dataset.full = name ? `${code} — ${name}` : code;
      return opt;
    };
    const group = (label, items) => {
      const el = document.createElement("optgroup");
      el.label = label;
      el.append(...items.map(option));
      return el;
    };
    const popular = POPULAR.map((code) => list.find((c) => c.code === code)).filter(Boolean);
    const rest = list.filter((c) => !POPULAR.includes(c.code));
    select.replaceChildren(
      ...(rest.length ? [group("Common", popular), group("All currencies", rest)] : popular.map(option))
    );
    compact(select);
  }
}

// Setting a <select> to a code it doesn't list would leave it blank.
function selectCurrency(select, code) {
  if (![...select.options].some((opt) => opt.value === code)) {
    const opt = new Option(code, code);
    opt.dataset.full = code;
    select.add(opt);
  }
  select.value = code;
  compact(select);
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
  const options = [
    { value: "", label: "All cases" },
    ...CATEGORIES.map((c) => ({ value: c, label: caseType(c) })),
    { value: SAVED, label: "Flagged" },
  ];
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
      label.innerHTML = `<input type="radio" name="category" value="${c}">${categoryIcon(c)}<span>${caseType(c)}</span>`;
      return label;
    })
  );
  $("condition-options").replaceChildren(
    ...CONDITIONS.map((c) => {
      const label = document.createElement("label");
      label.innerHTML = `<input type="radio" name="condition" value="${c}"><span>${stateOf(c)}</span>`;
      return label;
    })
  );
}

function contactProblem(method, value) {
  if (!value) return "Add a secure line so claimants can reach you.";
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
  if (!title) problem = "Give the case a name.";
  else if (fields.price.value === "" || !Number.isFinite(price) || price < 0) problem = "Enter a declared value of 0 or more.";
  else if (!fields.condition.value) problem = "Record the item's state.";
  else if (!fields.category.value) problem = "Pick a case type.";
  else if (!location) problem = "Say where the item is held.";
  else if (!seller) problem = "Add the reporting officer's name.";
  else problem = contactProblem(fields.contactMethod.value, contactValue);

  formError.textContent = problem;
  if (problem) return;

  const data = {
    title,
    description: fields.description.value.trim(),
    price,
    currency: fields.currency.value,
    condition: fields.condition.value,
    category: fields.category.value,
    location,
    seller,
    contact: { method: fields.contactMethod.value, value: contactValue },
    photo: state.photo,
  };

  if (state.editingId) {
    const id = state.editingId;
    if (!updateListing(id, data)) {
      formError.textContent = "Couldn't file that. Your browser's storage is full, so try a smaller photo or none.";
      return;
    }
    postDialog.close();
    render();
    openDetail(id);
    return;
  }

  const item = addListing(data);
  if (!item) {
    formError.textContent = "Couldn't file that. Your browser's storage is full, so try a smaller photo or none.";
    return;
  }
  postDialog.close();

  // Clear filters so the new listing is guaranteed to be visible at the top.
  Object.assign(state, { category: "", query: "", sort: "new", justPosted: item.id });
  search.value = "";
  sort.value = "new";
  render();
  // Highlight it once; later re-renders (typing in search) shouldn't replay it.
  state.justPosted = null;
  grid.firstElementChild?.scrollIntoView({ behavior: "smooth", block: "center" });
});

function showPhoto(src) {
  state.photo = src;
  const preview = $("photo-preview");
  preview.hidden = !src;
  if (src) preview.src = src;
  else preview.removeAttribute("src");
  $("photo-empty").hidden = Boolean(src);
  $("photo-remove").hidden = !src;
}

fields.photo.addEventListener("change", async () => {
  const file = fields.photo.files[0];
  fields.photo.value = "";
  if (!file) return;
  try {
    showPhoto(await shrinkPhoto(file));
  } catch {
    formError.textContent = "That file couldn't be read as an image.";
  }
});

$("photo-remove").addEventListener("click", () => showPhoto(null));

function openPostForm(item) {
  form.reset();
  formError.textContent = "";
  state.editingId = item?.id ?? null;
  $("post-title").textContent = item ? "Amend record" : "Log new evidence";
  $("post-submit").textContent = item ? "Save record" : "File it";

  if (item) {
    fields.title.value = item.title;
    fields.description.value = item.description ?? "";
    fields.price.value = item.price;
    selectCurrency(fields.currency, item.currency);
    fields.condition.value = item.condition;
    fields.category.value = item.category;
    fields.location.value = item.location;
    fields.seller.value = item.seller;
    fields.contactMethod.value = item.contact.method;
    fields.contactValue.value = item.contact.value;
  } else {
    selectCurrency(fields.currency, state.display);
  }
  fields.contactMethod.dispatchEvent(new Event("change"));
  showPhoto(item?.photo ?? null);
  postDialog.showModal();
  fields.title.focus();
}

form.addEventListener("input", () => {
  formError.textContent = "";
});

$("open-post").addEventListener("click", () => openPostForm(null));

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

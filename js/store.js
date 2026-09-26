const KEY = "listings-v1";

export const CATEGORIES = ["Books", "Electronics", "Furniture", "Clothing", "Stationery", "Other"];

const seed = [
  { title: "Casio fx-991EX calculator", category: "Electronics", price: 45, currency: "AED", posted: "2026-09-25T09:12:00Z" },
  { title: "Engineering Mathematics, B.S. Grewal (44th ed.)", category: "Books", price: 650, currency: "INR", posted: "2026-09-24T15:40:00Z" },
  { title: "Study desk lamp, warm white", category: "Furniture", price: 30, currency: "AED", posted: "2026-09-24T11:05:00Z" },
  { title: "Arduino Uno starter kit, barely used", category: "Electronics", price: 22, currency: "USD", posted: "2026-09-22T18:30:00Z" },
  { title: "Mini fridge, 50 L", category: "Furniture", price: 180, currency: "AED", posted: "2026-09-20T08:00:00Z" },
  { title: "Lab coat, size M", category: "Clothing", price: 15, currency: "AED", posted: "2026-09-19T13:20:00Z" },
].map((item, i) => ({ id: `seed-${i}`, ...item }));

let items = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seed.slice();
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Private mode or full storage: the listing still shows for this visit.
  }
}

export function allListings() {
  return items.slice().sort((a, b) => b.posted.localeCompare(a.posted));
}

export function addListing({ title, category, price, currency }) {
  const item = {
    id: crypto.randomUUID?.() ?? String(Date.now()),
    title,
    category,
    price,
    currency,
    posted: new Date().toISOString(),
  };
  items.push(item);
  persist();
  return item;
}

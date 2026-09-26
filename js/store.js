// Bump the key when the listing shape changes so old saved data doesn't break the page.
const KEY = "listings-v2";

export const CATEGORIES = [
  "Books",
  "Electronics",
  "Appliances",
  "Furniture",
  "Dorm essentials",
  "Clothing",
  "Stationery",
  "Other",
];

export const CONDITIONS = ["New", "Like new", "Used"];

export const STATUSES = {
  available: "Open for bids",
  reserved: "Bid received",
  sold: "Sold at auction",
};

const HOUR = 60 * 60 * 1000;

// Sample listings are dated relative to the first visit so the board never looks stale.
function seed() {
  const now = Date.now();
  const at = (hoursAgo) => new Date(now - hoursAgo * HOUR).toISOString();
  const email = (name) => ({ method: "email", value: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com` });

  return [
    {
      title: "Casio fx-991EX calculator",
      category: "Electronics",
      condition: "Like new",
      price: 45,
      currency: "AED",
      description: "Handed in at the Block B lobby. Works, comes with its hard cover, and the battery was replaced last month.",
      location: "Block B lobby",
      seller: "Rahul Menon",
      posted: at(3),
    },
    {
      title: "Engineering Mathematics textbook (Grewal)",
      category: "Books",
      condition: "Used",
      price: 650,
      currency: "INR",
      description: "B.S. Grewal, 44th edition. Found at the library entrance. Some pencil notes in the integration chapters; no pages missing.",
      location: "Library entrance",
      seller: "Nandita Iyer",
      posted: at(20),
    },
    {
      title: "LED desk lamp, warm white",
      category: "Dorm essentials",
      condition: "Like new",
      price: 30,
      currency: "AED",
      description: "USB powered with three brightness settings and a bendable neck. Tested and working.",
      location: "Hostel 2 reception",
      seller: "Omar Farouk",
      status: "reserved",
      posted: at(28),
    },
    {
      title: "Arduino Uno starter kit",
      category: "Electronics",
      condition: "Like new",
      price: 22,
      currency: "USD",
      description: "Found in the electronics lab. Board, breadboard, jumper wires and most sensors are there; the servo is missing.",
      location: "Electronics lab",
      seller: "Priya Nair",
      posted: at(49),
    },
    {
      title: "Mini fridge, 50 L",
      category: "Appliances",
      condition: "Used",
      price: 180,
      currency: "AED",
      description: "Left behind in Hostel 1. Cools well but hums a little at night. It is on the second floor, so the buyer needs to carry it down.",
      location: "Hostel 1, room 214",
      seller: "Karthik Srinivasan",
      posted: at(74),
    },
    {
      title: "Electric kettle, 1.7 L",
      category: "Appliances",
      icon: "kettle",
      condition: "Like new",
      price: 40,
      currency: "AED",
      description: "Unclaimed from the Hostel 3 common room. Auto shut-off works and it has been descaled.",
      location: "Hostel 3 common room",
      seller: "Aisha Khan",
      posted: at(98),
    },
    {
      title: "Lab coat, size M",
      category: "Clothing",
      condition: "Used",
      price: 15,
      currency: "AED",
      description: "Found in the chemistry lab. Washed and ironed, name tag removed.",
      location: "Chemistry lab",
      seller: "Sara Haddad",
      status: "sold",
      posted: at(122),
    },
    {
      title: "Office chair with lumbar support",
      category: "Furniture",
      condition: "Used",
      price: 120,
      currency: "AED",
      description: "Unclaimed after the summer move-out. Height adjustment works; one armrest is a little loose.",
      location: "Hostel 1 parking",
      seller: "Dev Patel",
      posted: at(170),
    },
    {
      title: "Graph notebooks, pack of 5",
      category: "Stationery",
      condition: "New",
      price: 12,
      currency: "AED",
      description: "Handed in still sealed at the Block A cafeteria. Never opened.",
      location: "Block A cafeteria",
      seller: "Meera Joshi",
      posted: at(220),
    },
    {
      title: "Data Structures textbook (Weiss)",
      category: "Books",
      condition: "Used",
      price: 60,
      currency: "AED",
      description: "Mark Allen Weiss, 3rd edition (C++). Found at the library entrance. Cover is worn, every page intact.",
      location: "Library entrance",
      seller: "Arjun Rao",
      posted: at(290),
    },
  ].map((item, i) => ({
    id: `seed-${i}`,
    status: "available",
    contact: email(item.seller),
    ...item,
  }));
}

let items = load();

// Earlier builds hotlinked sample photos, remembered "interested" taps and used
// shop-style wording; bring saved sample listings up to date without touching
// anything a visitor posted themselves.
const samples = new Map(seed().map((sample) => [sample.id, sample]));
for (const item of items) {
  if (item.photo && typeof item.photo !== "string") delete item.photo;
  delete item.interested;
  const sample = samples.get(item.id);
  if (sample) {
    Object.assign(item, { title: sample.title, description: sample.description });
    delete item.exhibit;
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const fresh = seed();
  persist(fresh);
  return fresh;
}

// Returns false when the browser refuses to store it, usually because photos
// have filled the localStorage quota.
function persist(list = items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function allListings() {
  return items.slice().sort((a, b) => b.posted.localeCompare(a.posted));
}

export function getListing(id) {
  return items.find((item) => item.id === id);
}

export function addListing(fields) {
  const item = {
    id: crypto.randomUUID?.() ?? String(Date.now()),
    status: "available",
    mine: true,
    posted: new Date().toISOString(),
    ...fields,
  };
  items.push(item);
  if (!persist()) {
    items.pop();
    return null;
  }
  return item;
}

export function updateListing(id, changes) {
  const item = getListing(id);
  if (!item) return false;
  const before = { ...item };
  Object.assign(item, changes);
  if (persist()) return true;
  Object.keys(item).forEach((key) => delete item[key]);
  Object.assign(item, before);
  return false;
}

export function removeListing(id) {
  items = items.filter((item) => item.id !== id);
  persist();
}

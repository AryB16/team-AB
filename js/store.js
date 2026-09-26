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
  available: "Open",
  reserved: "Under investigation",
  sold: "Case closed",
};

const HOUR = 60 * 60 * 1000;

// Sample listings are dated relative to the first visit so the board never looks stale.
function seed() {
  const now = Date.now();
  const at = (hoursAgo) => new Date(now - hoursAgo * HOUR).toISOString();
  const email = (name) => ({ method: "email", value: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com` });

  return [
    {
      title: "Calculator, Casio fx-991EX",
      category: "Electronics",
      condition: "Like new",
      price: 45,
      currency: "AED",
      description: "Recovered in working order with its hard cover. Battery replaced last month. Minor wear consistent with one semester of use.",
      location: "Block B lobby",
      seller: "Rahul Menon",
      posted: at(3),
    },
    {
      title: "Textbook, Engineering Mathematics (Grewal, 44th ed.)",
      category: "Books",
      condition: "Used",
      price: 650,
      currency: "INR",
      description: "Pencil annotations found in the integration chapters. No pages missing or torn.",
      location: "Library entrance",
      seller: "Nandita Iyer",
      posted: at(20),
    },
    {
      title: "Desk lamp, warm white LED",
      category: "Dorm essentials",
      condition: "Like new",
      price: 30,
      currency: "AED",
      description: "USB powered, three brightness settings, bendable neck. Tested and fully functional.",
      location: "Hostel 2 reception",
      seller: "Omar Farouk",
      status: "reserved",
      posted: at(28),
    },
    {
      title: "Arduino Uno starter kit, incomplete",
      category: "Electronics",
      condition: "Like new",
      price: 22,
      currency: "USD",
      description: "Board, breadboard, jumper wires and most sensors accounted for. Servo motor not recovered.",
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
      description: "Cooling confirmed. Audible hum at night. Held on the second floor; the claimant must carry it down.",
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
      description: "Auto shut-off working. Approximately two months of use. Descaled before logging.",
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
      description: "Laundered and pressed. Owner's name tag removed.",
      location: "Chemistry lab",
      seller: "Sara Haddad",
      status: "sold",
      posted: at(122),
    },
    {
      title: "Office chair, lumbar support",
      category: "Furniture",
      condition: "Used",
      price: 120,
      currency: "AED",
      description: "Height adjustment working. Left armrest loose. No other damage recorded.",
      location: "Hostel 1 parking",
      seller: "Dev Patel",
      posted: at(170),
    },
    {
      title: "Graph notebooks ×5, sealed",
      category: "Stationery",
      condition: "New",
      price: 12,
      currency: "AED",
      description: "Seals intact. Duplicate purchase, never opened.",
      location: "Block A cafeteria",
      seller: "Meera Joshi",
      posted: at(220),
    },
    {
      title: "Textbook, Data Structures and Algorithm Analysis (Weiss)",
      category: "Books",
      condition: "Used",
      price: 60,
      currency: "AED",
      description: "3rd edition, C++. Cover worn; every page intact.",
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
  if (sample) Object.assign(item, { title: sample.title, description: sample.description });
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

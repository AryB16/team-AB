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
      title: "The Block B Calculator",
      exhibit: "Scientific calculator",
      category: "Electronics",
      condition: "Like new",
      price: 45,
      currency: "AED",
      description: "Casio fx-991EX, recovered in working order with its hard cover. Battery replaced last month. Minor wear consistent with one semester of use.",
      location: "Block B lobby",
      seller: "Rahul Menon",
      posted: at(3),
    },
    {
      title: "The Annotated Integrals",
      exhibit: "Engineering maths textbook",
      category: "Books",
      condition: "Used",
      price: 650,
      currency: "INR",
      description: "Engineering Mathematics by B.S. Grewal, 44th edition. Pencil annotations found in the integration chapters. No pages missing or torn.",
      location: "Library entrance",
      seller: "Nandita Iyer",
      posted: at(20),
    },
    {
      title: "The Hostel 2 Lamp",
      exhibit: "LED desk lamp",
      category: "Dorm essentials",
      condition: "Like new",
      price: 30,
      currency: "AED",
      description: "Warm white, USB powered, three brightness settings, bendable neck. Tested and fully functional.",
      location: "Hostel 2 reception",
      seller: "Omar Farouk",
      status: "reserved",
      posted: at(28),
    },
    {
      title: "The Missing Servo",
      exhibit: "Microcontroller kit, parts missing",
      category: "Electronics",
      condition: "Like new",
      price: 22,
      currency: "USD",
      description: "Arduino Uno board, breadboard, jumper wires and most sensors accounted for. Servo motor not recovered.",
      location: "Electronics lab",
      seller: "Priya Nair",
      posted: at(49),
    },
    {
      title: "The Humming Fridge",
      exhibit: "Compact refrigerator",
      category: "Appliances",
      condition: "Used",
      price: 180,
      currency: "AED",
      description: "50 litre mini fridge. Cooling confirmed, audible hum at night. Held on the second floor; the claimant must carry it down.",
      location: "Hostel 1, room 214",
      seller: "Karthik Srinivasan",
      posted: at(74),
    },
    {
      title: "The Descaled Kettle",
      exhibit: "Electric kettle",
      category: "Appliances",
      icon: "kettle",
      condition: "Like new",
      price: 40,
      currency: "AED",
      description: "1.7 litre, auto shut-off working. Approximately two months of use. Descaled before logging.",
      location: "Hostel 3 common room",
      seller: "Aisha Khan",
      posted: at(98),
    },
    {
      title: "The Nameless Lab Coat",
      exhibit: "Laboratory coat",
      category: "Clothing",
      condition: "Used",
      price: 15,
      currency: "AED",
      description: "White, size M. Laundered and pressed. Owner's name tag removed.",
      location: "Chemistry lab",
      seller: "Sara Haddad",
      status: "sold",
      posted: at(122),
    },
    {
      title: "The Loose Armrest",
      exhibit: "Swivel office chair",
      category: "Furniture",
      condition: "Used",
      price: 120,
      currency: "AED",
      description: "Mesh back with lumbar support. Height adjustment working, left armrest loose. No other damage recorded.",
      location: "Hostel 1 parking",
      seller: "Dev Patel",
      posted: at(170),
    },
    {
      title: "The Unopened Notebooks",
      exhibit: "Sealed notebooks",
      category: "Stationery",
      condition: "New",
      price: 12,
      currency: "AED",
      description: "Pack of five graph-ruled notebooks. Seals intact. Duplicate purchase, never opened.",
      location: "Block A cafeteria",
      seller: "Meera Joshi",
      posted: at(220),
    },
    {
      title: "The Worn-Cover Textbook",
      exhibit: "Programming textbook",
      category: "Books",
      condition: "Used",
      price: 60,
      currency: "AED",
      description: "Data Structures and Algorithm Analysis in C++ by Mark Allen Weiss, 3rd edition. Cover worn; every page intact.",
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
  if (sample) Object.assign(item, { title: sample.title, exhibit: sample.exhibit, description: sample.description });
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

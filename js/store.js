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
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
};

const HOUR = 60 * 60 * 1000;

// Sample photos are hotlinked from Wikimedia Commons; each file page lists its
// author and licence (credited in the listing view and the README).
function commons(file) {
  return {
    src: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=640`,
    credit: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`,
  };
}

// Sample listings are dated relative to the first visit so the board never looks stale.
function seed() {
  const now = Date.now();
  const at = (hoursAgo) => new Date(now - hoursAgo * HOUR).toISOString();
  const email = (name) => ({ method: "email", value: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com` });

  return [
    {
      title: "Casio fx-991EX calculator",
      photo: commons("Fx-991EX.jpg"),
      category: "Electronics",
      condition: "Like new",
      price: 45,
      currency: "AED",
      description: "Used for one semester of maths. Comes with the hard cover, and the battery was replaced last month.",
      location: "Block B lobby",
      seller: "Rahul Menon",
      posted: at(3),
    },
    {
      title: "Engineering Mathematics, B.S. Grewal (44th ed.)",
      photo: commons("College_Textbooks.jpg"),
      category: "Books",
      condition: "Used",
      price: 650,
      currency: "INR",
      description: "A few pencil notes in the integration chapters, otherwise clean. No torn pages.",
      location: "Library entrance",
      seller: "Nandita Iyer",
      posted: at(20),
    },
    {
      title: "Study desk lamp, warm white",
      photo: commons("A_desk_lamp.jpg"),
      category: "Dorm essentials",
      condition: "Like new",
      price: 30,
      currency: "AED",
      description: "USB powered with three brightness levels. Bendable neck.",
      location: "Hostel 2 reception",
      seller: "Omar Farouk",
      status: "reserved",
      posted: at(28),
    },
    {
      title: "Arduino Uno starter kit",
      photo: commons("Arduino_Uno_-_R3.jpg"),
      category: "Electronics",
      condition: "Like new",
      price: 22,
      currency: "USD",
      description: "Board, breadboard, jumper wires and most of the sensors. The servo is missing.",
      location: "Electronics lab",
      seller: "Priya Nair",
      posted: at(49),
    },
    {
      title: "Mini fridge, 50 L",
      photo: commons("Mini_Fridge_-_Refrigerator_Wire_Shelves_(54127913190).jpg"),
      category: "Appliances",
      condition: "Used",
      price: 180,
      currency: "AED",
      description: "Cools well, a little noisy at night. You'll need to carry it down from the second floor.",
      location: "Hostel 1, room 214",
      seller: "Karthik Srinivasan",
      posted: at(74),
    },
    {
      title: "Electric kettle, 1.7 L",
      photo: commons("Electric-kettle.jpg"),
      category: "Appliances",
      icon: "kettle",
      condition: "Like new",
      price: 40,
      currency: "AED",
      description: "Auto shut-off, used for about two months. Descaled before listing.",
      location: "Hostel 3 common room",
      seller: "Aisha Khan",
      posted: at(98),
    },
    {
      title: "Lab coat, size M",
      photo: commons("Lab_coats.jpg"),
      category: "Clothing",
      condition: "Used",
      price: 15,
      currency: "AED",
      description: "Washed and ironed. Name tag removed.",
      location: "Chemistry lab",
      seller: "Sara Haddad",
      status: "sold",
      posted: at(122),
    },
    {
      title: "Office chair with lumbar support",
      photo: commons("Sihoo_M57_mesh_office_chair_01.jpg"),
      category: "Furniture",
      condition: "Used",
      price: 120,
      currency: "AED",
      description: "Height adjustable, one armrest is slightly loose. Much better than the hostel chairs.",
      location: "Hostel 1 parking",
      seller: "Dev Patel",
      posted: at(170),
    },
    {
      title: "Graph notebooks, pack of 5",
      photo: commons("Graph_paper_notepad_(4562203394).jpg"),
      category: "Stationery",
      condition: "New",
      price: 12,
      currency: "AED",
      description: "Bought an extra pack by mistake. Still sealed.",
      location: "Block A cafeteria",
      seller: "Meera Joshi",
      posted: at(220),
    },
    {
      title: "Data Structures and Algorithm Analysis, Weiss",
      photo: commons("Stack_of_Books.jpg"),
      category: "Books",
      condition: "Used",
      price: 60,
      currency: "AED",
      description: "3rd edition, C++ version. Cover is worn but every page is intact.",
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

// Visitors from before sample photos existed keep their data but gain the photos.
for (const sample of seed()) {
  const saved = items.find((item) => item.id === sample.id);
  if (saved && !saved.photo) saved.photo = sample.photo;
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

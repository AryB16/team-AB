// Line drawings for each category, drawn on a 48-unit grid.
const paths = {
  Books:
    "M8 11.5c0-1.4 1.1-2.5 2.5-2.5H22v29H10.5A2.5 2.5 0 0 1 8 35.5zM40 11.5c0-1.4-1.1-2.5-2.5-2.5H26v29h11.5a2.5 2.5 0 0 0 2.5-2.5zM12 15h6M12 19h6M30 15h6M30 19h6",
  Electronics:
    "M10 12h28a2 2 0 0 1 2 2v17H8V14a2 2 0 0 1 2-2zM4 35h40l-2 3H6zM21 35h6",
  Furniture:
    "M13 22v-7a3 3 0 0 1 3-3h16a3 3 0 0 1 3 3v7M9 22h30a2 2 0 0 1 2 2v6H7v-6a2 2 0 0 1 2-2zM11 30v8M37 30v8",
  Clothing:
    "M18 8l-9 5 3 7 4-2v21h16V18l4 2 3-7-9-5c0 3.3-2.7 6-6 6s-6-2.7-6-6z",
  Stationery:
    "M9 39l2.5-8.5L31 11l6 6-19.5 19.5zM27 15l6 6M11.5 30.5l6 6",
  Other:
    "M8 15l16-8 16 8v18l-16 8-16-8zM8 15l16 8 16-8M24 23v18",
};

export function categoryIcon(category) {
  const d = paths[category] ?? paths.Other;
  return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="${d}"/></svg>`;
}

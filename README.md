# AB Marketplace

## Live site: [team-ab.vercel.app](https://team-ab.vercel.app)

Buy and sell things nearby, reskinned in round 4 as a police evidence locker. Log an item, search the case files, see valuations in your own currency, and request clearance to contact the reporting officer.

## Features

- Post listings with a photo, price, condition, category and pickup point
- Filter by category, search, and sort by price
- Prices converted to any currency via the [Frankfurter](https://frankfurter.dev) API
- Seller contact stays hidden until you tap "I'm interested"
- Save listings, and edit, reserve or mark your own as sold

Plain HTML, CSS and JavaScript. No build step, no dependencies. To run locally: `python3 -m http.server`

## Rounds

1. **Base build:** post, browse, filter and search listings
2. **Currency:** live conversion with the Frankfurter API
3. **No new libraries:** photos, saved listings, edit/delete, contact reveal, all in vanilla JS
4. **Reskin:** now the AB Precinct Evidence Locker. Listings are case files in manila folders, statuses are rubber stamps ("Under investigation", "Case closed"), and seller contact stays redacted until you request clearance. Same features underneath.

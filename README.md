# AB Marketplace

## Live site: [code-and-chaos.vercel.app](https://code-and-chaos.vercel.app/)

Buy and sell things nearby, reskinned in round 4 as a police lost property office. Browse unclaimed items, filter and search, see prices in your own currency, and put in a claim.

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
4. **Reskin:** now AB Precinct Lost Property, where the police property office lists unclaimed found items. Listings are manila folders with reference tabs, each opening on a sealed property bag with a printed label and a property history (Found & logged → Claim requested → Claimed). Statuses are rubber stamps ("Claim pending", "Claimed") and the officer's contact stays redacted until you make a claim. Same features underneath.

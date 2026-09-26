# AB Marketplace

## Live site: [code-and-chaos.vercel.app](https://code-and-chaos.vercel.app/)

Buy and sell things nearby, reskinned in round 4 as a police auction of unclaimed lost property. Browse lots, filter and search, see reserve prices in your own currency, and place a bid.

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
4. **Reskin:** now the AB Precinct Property Auction, where lost property nobody claims within 30 days is auctioned off. Listings are manila lot folders with typed lot numbers, each opening on a sealed property bag with a printed label and a lot history (Found & logged → Unclaimed after 30 days → Bid placed → Sold). Prices are reserve prices, statuses are rubber stamps ("Bid received", "Sold at auction"), and the auction officer's contact stays redacted until you place a bid. Same features underneath.

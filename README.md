# AB Marketplace

A small marketplace for buying and selling things nearby. Post an item, browse what others have listed, open a listing for the details, and get in touch with the seller.

## Features

- **Post a listing** with a title, description, price, condition, category, pickup point and a WhatsApp number or email.
- **Browse** everything that's up, newest first, with relative times ("3 hours ago") and the seller's name.
- **Filter and search** by category chips and free text (titles, descriptions and pickup points), and sort by price.
- **Listing details:** tap any listing to see the full description and pickup point. "I'm interested" reveals the seller's contact and opens WhatsApp or email with a message ready to send.
- **Listing status:** sellers can mark their own listings as available, reserved or sold. Sold items stay visible but are struck through.
- **Any currency:** pick a currency at the top and every price is converted at the latest reference rate. The seller's original price is shown next to it.

## Currency conversion

Rates come from the [Frankfurter](https://frankfurter.dev) API (no key needed). The app uses Frankfurter's v2 endpoint, which blends several central banks and so covers currencies like AED that the ECB-only v1 API doesn't. If v2 fails it falls back to v1, and if both are down the page says so and shows each seller's original price.

Rates are requested once per display currency, with that currency as the base, so a single request converts every listing. Responses are cached for an hour.

## Running it

There's no build step. Serve the folder with any static server and open it in a browser:

```
python3 -m http.server
```

Then visit http://localhost:8000.

Listings are stored in the browser's localStorage, so each visitor starts with the same sample listings and sees their own posts alongside them.

## Project layout

```
index.html      page structure, post form and listing dialog
styles.css      all styling
js/app.js       rendering, filters, dialogs and the post form
js/store.js     listings, categories and localStorage persistence
js/money.js     Frankfurter client and price formatting
js/icons.js     line icons for each category
```

## Progress by round

- **Round 1:** posting, browsing, category filter and search, listing detail view with seller contact.
- **Round 2:** prices converted into the viewer's chosen currency using the Frankfurter API, with sort by converted price.

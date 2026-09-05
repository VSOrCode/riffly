# Catalog guide

Every item on the site comes from one file:

```
public/assets/data/products.json
```

Edit it, save, deploy. No code changes needed.

> **Tip:** JSON is picky. No trailing commas, all keys and text in
> `"double quotes"`. Paste the file into <https://jsonlint.com> if the site
> shows "catalog failed to load" after an edit.

---

## File shape

```json
{
  "shop": "Riffly",
  "currency": "usd",
  "updated": "2026-09-02",
  "pickupLocation": "Mesa, AZ",
  "categories": ["Tools", "Electronics", "Furniture", "..."],
  "products": [
    { ...item... },
    { ...item... }
  ]
}
```

- **categories** — the filter buttons on the shop page, in this order. An item's
  `category` should match one of these exactly (or add a new one here).
- **pickupLocation** — shown on local-pickup items.

---

## One item, field by field

```json
{
  "id": "0011",
  "slug": "brown-leather-armchair",
  "name": "Worn-In Brown Leather Armchair",
  "category": "Furniture",
  "price": 18000,
  "condition": "Good",
  "conditionNote": "Cushion sag on the seat; small scuff on the right arm, pictured.",
  "description": "A full-grain leather armchair with the kind of patina you can't fake. Frame is tight, no wobble.",
  "dimensions": "32 x 34 x 38 in",
  "weight": "60 lb",
  "images": [],
  "shipping": 0,
  "pickupOnly": true,
  "lot": "Unit 118 / Chandler, AZ / Sep 2026",
  "status": "available",
  "addedAt": "2026-09-02"
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | ✅ | Unique. Any string. Keep the 4-digit style (`"0011"`) so URLs sort nicely. **Never reuse an id.** |
| `slug` | – | Not used for routing yet; nice to keep for later. Lowercase-with-dashes. |
| `name` | ✅ | Shown everywhere. Keep under ~60 chars. |
| `category` | ✅ | Must match an entry in the top-level `categories` list. |
| `price` | ✅ | **In cents.** `18000` = $180.00. Whole numbers only. |
| `condition` | ✅ | One of: `Excellent`, `Very Good`, `Good`, `Fair`, `Varies`. Controls the badge colour. |
| `conditionNote` | ✅ | One or two sentences naming the specific flaws. This is the trust builder — be honest. |
| `description` | ✅ | The sales copy. 1–3 sentences. |
| `dimensions` | – | Free text. Shown in the spec list. |
| `weight` | – | Free text. |
| `images` | ✅ (can be `[]`) | See below. Empty array = generated placeholder. |
| `shipping` | ✅ | **In cents.** Flat shipping for this item. Use `0` for pickup-only items. |
| `pickupOnly` | ✅ | `true` = no shipping option, buyer collects locally. `false` = ships. |
| `lot` | – | The "provenance" line — which unit / city / month it came from. Adds character; optional. |
| `status` | ✅ | `available` or `sold`. (`reserved` also hides the buy button.) |
| `addedAt` | ✅ | `YYYY-MM-DD`. Drives the "Recently added" sort. |

---

## Common tasks

### Add an item
Copy the last object in `products`, paste it after (with a comma between
`}` and `{`), then change the fields. Give it a fresh `id` and today's
`addedAt`.

### Mark something sold
Change `"status": "available"` to `"status": "sold"`.
It stays on the site with a **SOLD** ribbon and moves to the end of the grid.
(You can also just delete the object — but keeping it as `sold` for a while is
good for showing the shop moves stock.)

### Add real photos
1. Name files by id: `0011-1.jpg`, `0011-2.jpg`, `0011-3.jpg`.
2. Put them in `public/assets/img/products/`.
3. List them, front photo first:
   ```json
   "images": [
     "/assets/img/products/0011-1.jpg",
     "/assets/img/products/0011-2.jpg",
     "/assets/img/products/0011-3.jpg"
   ]
   ```
Aim for roughly square, ~1200×1200px, under 300 KB each. The first image is
also the one Stripe shows at checkout.

### Add a new category
Add the name to the top-level `categories` array, then use it as an item's
`category`. It appears as a new filter button automatically.

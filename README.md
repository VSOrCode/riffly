# Riffly

Storefront for **riffly.com** — one-of-a-kind items from storage unit auctions.

Static HTML/CSS/JS for the shop, plus PHP + MySQL for **customer accounts** and
**Stripe checkout**. No build step, no framework. Deploys to HostGator.

---

## Preview it locally

PHP 8.4 is installed (`winget install PHP.PHP.8.4`); the local DB is SQLite so
nothing else is needed.

```bash
# one-time: create the local database
php -c dev/php.ini dev/init-db.php

# run the site
php -c dev/php.ini -S 127.0.0.1:8001 -t public
```

Open <http://127.0.0.1:8001>. Details + helper scripts: [`dev/README.md`](dev/README.md).

Works locally: browsing, cart, sign up / sign in, the username-taken check, the
login gate on checkout, Buy Now. **Stripe payment** and **Google sign-in** need
server keys and show a friendly "not switched on yet" message until then.

---

## How it hangs together

| Part | Where |
|---|---|
| Shop, cart, Buy Now | static — `public/index.html`, `item.html`, `assets/js/*` |
| Accounts (email/password + Google) | `public/api/auth/*` + MySQL `users` table |
| "Checkout" / "Buy now" | login required → `checkout.html` → `api/create-checkout-session.php` → Stripe |
| Catalog | `public/assets/data/products.json` (single source of truth for prices) |

```
riffly/
├── public/                      ← the web root (this whole folder deploys)
│   ├── index.html  item.html  about.html
│   ├── account.html  checkout.html  success.html  cancel.html  404.html
│   ├── assets/{css,js,data,img}
│   └── api/
│       ├── lib/        db + auth + session helpers
│       ├── auth/       signup, login, logout, check-username, google-*
│       ├── create-checkout-session.php
│       └── config.sample.php   → copy to config.php on the server
├── dev/                         ← local-only (PHP ini, SQLite, serve scripts)
├── docs/
│   ├── deploy-hostgator.md      full deployment walkthrough
│   ├── schema.mysql.sql         run once in phpMyAdmin
│   └── catalog-guide.md         how to add / edit / retire items
├── .cpanel.yml                  HostGator Git deploy
└── .gitignore
```

## Editing the catalog

All items live in [`public/assets/data/products.json`](public/assets/data/products.json).
Field reference: [`docs/catalog-guide.md`](docs/catalog-guide.md). Prices are in
cents. `"status": "sold"` keeps an item visible with a SOLD badge.

## Deploying

[`docs/deploy-hostgator.md`](docs/deploy-hostgator.md). Short version: push to
GitHub → cPanel Git Version Control clones + deploys → create the MySQL database
→ create `api/config.php` → install the Stripe library.

## Payments / login status

- **Accounts:** fully built. Go live once the MySQL database + `config.php` exist.
- **Stripe checkout:** built. Go live once the Stripe library + secret key are on the server.
- **Google sign-in:** built. Optional. Hidden until a Google OAuth client is in `config.php`.

Until each is configured, that part degrades to a clear "not switched on yet" message.

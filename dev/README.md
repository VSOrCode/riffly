# dev/ — local development only

Nothing in here is deployed. It lets you run the full site (PHP + accounts)
on your own machine against a throwaway SQLite database.

## One-time setup

PHP 8.4 is installed (via `winget install PHP.PHP.8.4`). `dev/php.ini` points at
its extension folder and turns on the extensions the site needs.

```bash
# create the local SQLite database (dev/riffly.sqlite)
php -c dev/php.ini dev/init-db.php
```

`public/api/config.php` already exists as a **local** config (SQLite, no Stripe
keys, no Google keys). It is git-ignored and separate from the real server config.

## Run the site

```bash
php -c dev/php.ini -S 127.0.0.1:8001 -t public
```

Then open <http://127.0.0.1:8001>.

Or use the helper:

```bash
sh dev/serve.sh          # macOS / Linux / Git Bash
powershell dev/serve.ps1 # Windows PowerShell
```

## What works locally

- Browsing, cart, accounts (sign up / sign in / sign out), the username-taken
  check, the login gate on checkout, Buy Now.
- **Not** locally: real Stripe payment (no keys) and Google sign-in (no keys).
  Both degrade to a friendly "not switched on yet" message.

## Reset the database

```bash
rm dev/riffly.sqlite && php -c dev/php.ini dev/init-db.php
```

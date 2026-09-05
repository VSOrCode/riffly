# Riffly API — server setup

The dynamic part of Riffly: PHP endpoints for **accounts/login** and **Stripe
checkout**. Runs on HostGator's PHP + MySQL. Everything else on the site is static.

```
api/
├── lib/
│   ├── bootstrap.php   config loader, JSON + session + CSRF helpers
│   ├── db.php          PDO connection (MySQL in prod, SQLite in local dev)
│   ├── auth.php        sessions, users, username checks, rate limiting
│   └── http.php        outbound HTTP (Google OAuth)
├── auth/
│   ├── me.php              GET  -> current user + CSRF token
│   ├── signup.php          POST username/email/password
│   ├── login.php           POST username-or-email/password
│   ├── logout.php          POST
│   ├── check-username.php  GET  ?u=name -> {available, message}
│   ├── set-username.php    POST (new Google users pick a username)
│   ├── google-start.php    redirect to Google
│   └── google-callback.php Google returns here
├── create-checkout-session.php   POST -> Stripe Checkout URL (login required)
├── config.sample.php   -> copy to config.php (git-ignored)
└── .htaccess           blocks lib/, config, *.sql from the web
```

## Setup checklist (HostGator)

1. **PHP 8.1+** — cPanel → MultiPHP Manager. Needs `pdo_mysql` + `curl` +
   `openssl` (usually on by default; cPanel → Select PHP Version → Extensions).
2. **MySQL database** — create one, import `docs/schema.mysql.sql` via phpMyAdmin.
3. **`config.php`** — copy from `config.sample.php`, fill in `site_url`,
   `app_secret`, the `db` block, and `stripe_secret_key`.
4. **Stripe library** — `composer require stripe/stripe-php` in this folder,
   or upload a release build to `api/stripe-php/`.
5. **Google (optional)** — add `google.client_id` / `client_secret` to
   `config.php`. Redirect URI in Google Console:
   `https://riffly.com/api/auth/google-callback.php`.

Full walkthrough: `docs/deploy-hostgator.md`.

## Security notes

- Passwords hashed with `password_hash()` (bcrypt). Never stored or logged in clear.
- Sessions: HttpOnly, SameSite=Lax, Secure over HTTPS, id regenerated on login.
- Every state-changing request needs a matching `X-CSRF-Token` header + same origin.
- Login is rate-limited per IP and per username (15-minute window).
- Checkout prices are read from `assets/data/products.json` on the server — a
  tampered cart in the browser cannot change what Stripe charges.
- `config.php` holds all secrets and is git-ignored. `.htaccess` also blocks it.

## Test cards (Stripe test mode)

`4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.

## Not built yet (ask if you want them)

- Password reset by email
- Email verification on signup
- Order history / "my orders" page (needs a `checkout.session.completed` webhook)
- CAPTCHA on signup (hCaptcha / Cloudflare Turnstile) if bots become a problem

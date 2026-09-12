# Deploying Riffly to HostGator

Flow: **local → GitHub → HostGator**. You edit locally, push to GitHub, and
HostGator pulls the changes and copies `public/` into your web root.

The site now has three server-side pieces, all on HostGator's PHP + MySQL:

| Piece | Needs |
|---|---|
| Storefront + cart | nothing (static) |
| **Accounts / login** | a MySQL database + `config.php` |
| Stripe checkout | the Stripe PHP library + keys in `config.php` |
| "Continue with Google" (optional) | a Google OAuth client in `config.php` |
| reCAPTCHA on signup (optional) | site/secret keys in `config.php`, with `riffly.com` on the key's allowed-domains list |

---

## Step 1 — Push to GitHub

From `D:\Work\Sites\riffly`:

```bash
git init
git add .
git commit -m "Riffly storefront + accounts"
git branch -M main
git remote add origin https://github.com/YOURNAME/riffly.git
git push -u origin main
```

Create the empty `riffly` repo on github.com first (no README).

## Step 2 — Set the deploy path

Edit `.cpanel.yml`, replace `cpaneluser` with your cPanel username (and adjust
the folder if riffly.com is an addon domain — check cPanel → Domains). Commit + push.

## Step 3 — Get the files onto HostGator

**Option A — cPanel Git Version Control (preferred)**

1. cPanel → **Git Version Control** → **Create**.
2. Clone URL: `https://github.com/YOURNAME/riffly.git` (private repo: use
   `https://YOURNAME:TOKEN@github.com/...` with a
   [personal access token](https://github.com/settings/tokens)).
3. Repository Path: `/home/YOURUSER/repositories/riffly`.
4. After it clones: **Manage** → **Pull or Deploy** → **Update from Remote**,
   then **Deploy HEAD Commit**. `.cpanel.yml` copies `public/` into your web root.

Every later update: `git push`, then **Update from Remote** → **Deploy HEAD Commit**.

**Option B — manual upload:** cPanel → File Manager → upload the **contents of
`public/`** into the web root (turn on "show hidden files" so `.htaccess` uploads).

## Step 4 — PHP version

cPanel → **MultiPHP Manager** → set riffly.com to **PHP 8.1 or newer**.

## Step 5 — Create the database (accounts / login)

1. cPanel → **MySQL Databases**.
2. *Create New Database* → e.g. `riffly` → you get `cpuser_riffly`.
3. *Add New User* → e.g. `rifflyapp` → strong password → you get `cpuser_rifflyapp`.
4. *Add User To Database* → select both → **All Privileges**.
5. cPanel → **phpMyAdmin** → pick `cpuser_riffly` → **Import** tab → upload
   `docs/schema.mysql.sql` → **Go**. You should see `users` and `login_attempts`.

## Step 6 — Create `config.php`

In File Manager, go to the deployed `api/` folder. Copy `config.sample.php` to
`config.php` and edit it:

```php
<?php
return array(
  'site_url'   => 'https://riffly.com',
  'app_secret' => '<paste output of: php -r "echo bin2hex(random_bytes(32));">',

  'db' => array(
    'dsn'  => 'mysql:host=localhost;dbname=cpuser_riffly;charset=utf8mb4',
    'user' => 'cpuser_rifflyapp',
    'pass' => 'THE_DB_PASSWORD',
  ),

  'stripe_secret_key' => 'sk_test_...',        // test key first
  'shipping_label'    => 'Standard shipping (2-5 business days)',
  'ship_to'           => array('US'),

  'google' => array('client_id' => '', 'client_secret' => ''),  // fill in Step 8, or leave empty

  'recaptcha' => array(
    'site_key'   => 'your reCAPTCHA site key',
    'secret_key' => 'your reCAPTCHA secret key',
  ),
);
```

Make sure `riffly.com` is on the key's allowed-domains list at
google.com/recaptcha/admin → your site → Settings, or the checkbox shows a
"domain not supported" error instead of the human-check.

`config.php` is git-ignored, so deploys never overwrite it.

## Step 7 — Install the Stripe PHP library

SSH / Terminal:

```bash
cd ~/public_html/api && composer require stripe/stripe-php
```

No SSH? Download `stripe-php.zip` from
<https://github.com/stripe/stripe-php/releases> and upload it so you have
`api/stripe-php/init.php`. See `public/api/README.md`.

## Step 8 — Google Sign-In (optional)

1. <https://console.cloud.google.com> → create a project.
2. **APIs & Services → OAuth consent screen** → External → app name "Riffly",
   your support email, add `riffly.com` under Authorized domains → save.
3. **Credentials → Create credentials → OAuth client ID → Web application**.
   - Authorized JavaScript origins: `https://riffly.com`
   - Authorized redirect URIs: `https://riffly.com/api/auth/google-callback.php`
4. Copy the Client ID + Client secret into `config.php` under `google`.

Until this is done, the "Continue with Google" button is simply hidden and
email/password signup works on its own.

## Step 9 — HTTPS

cPanel → **SSL/TLS Status** → confirm riffly.com has a certificate (AutoSSL).
`.htaccess` already forces `https://`.

## Step 10 — Test on the live site

- Sign up with a test account → you land back on the site, signed in.
- Try a taken username → "That username is taken, please try again."
- Add to cart / Buy now → you're sent to sign in, then to the review page.
- With a **test** Stripe key, pay with card `4242 4242 4242 4242` → lands on
  `/success.html`; the payment shows in the Stripe test dashboard.

## Step 11 — Go live

`config.php`: swap `sk_test_...` for `sk_live_...`. Do one real low-value order
and refund it.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| "The site database is not configured yet" | `db` block missing/blank in `config.php` |
| "database is unavailable" | wrong db name/user/pass, or user not added to the database |
| Login/signup 500 | PHP < 8.0, or `mysqli`/`pdo_mysql` disabled — cPanel → *Select PHP Version* → Extensions |
| "payment library is not installed" | Stripe SDK missing from `api/vendor/` or `api/stripe-php/` |
| Google button missing | `google.client_id` empty in `config.php` (expected until Step 8) |
| Google returns `redirect_uri_mismatch` | the URI in Google Console must be exactly `https://riffly.com/api/auth/google-callback.php` |
| Unstyled page / 404s for assets | files landed in a subfolder — `index.html` must be directly in the web root |

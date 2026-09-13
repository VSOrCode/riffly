<?php
/**
 * Riffly configuration - TEMPLATE
 * =============================================================================
 *  1.  Copy this file to  config.php  in this same folder.
 *  2.  Fill in real values.
 *  3.  Never commit config.php - it is already listed in .gitignore.
 * =============================================================================
 */

return array(

    /* ---- Site -------------------------------------------------------------- */
    // Public origin, NO trailing slash. Used for redirects and OAuth callbacks.
    'site_url' => 'https://riffly.com',

    // Long random string. Generate one:  php -r "echo bin2hex(random_bytes(32));"
    'app_secret' => 'REPLACE_WITH_A_LONG_RANDOM_STRING',

    /* ---- Database (accounts / login) ------------------------------------------
     * On HostGator: cPanel -> MySQL Databases -> create a database + user, add
     * the user to the database with ALL PRIVILEGES. Names are prefixed with your
     * cPanel user, e.g. "cpuser_riffly".
     * Then import docs/schema.mysql.sql via phpMyAdmin.
     */
    'db' => array(
        'dsn'  => 'mysql:host=localhost;dbname=cpuser_riffly;charset=utf8mb4',
        'user' => 'cpuser_riffly',
        'pass' => 'REPLACE_WITH_DB_PASSWORD',
    ),

    /* ---- Stripe --------------------------------------------------------------
     * https://dashboard.stripe.com/apikeys  - start with a TEST key.
     */
    'stripe_secret_key' => 'sk_test_REPLACE_WITH_YOUR_KEY',
    // 'stripe_api_version' => '2024-06-20',

    /* ---- Subscriptions (optional) -------------------------------------------
     * For each plan, create a Product in Stripe with a monthly Price and a
     * yearly Price, then paste the two Price ids (price_...) below.
     * dashboard.stripe.com -> Product catalog -> + Add product.
     * Leave a price_ids entry as REPLACE_ME to keep that plan/interval
     * disabled (its Subscribe button will show a "not configured" message).
     */
    'plans' => array(
        'basic' => array(
            'name' => 'Basic',
            'price_ids' => array(
                'month' => 'price_REPLACE_ME_BASIC_MONTHLY',
                'year'  => 'price_REPLACE_ME_BASIC_YEARLY',
            ),
            'shipping_free'    => true,
            'discount_percent' => 0,
        ),
        'plus' => array(
            'name' => 'Plus',
            'price_ids' => array(
                'month' => 'price_REPLACE_ME_PLUS_MONTHLY',
                'year'  => 'price_REPLACE_ME_PLUS_YEARLY',
            ),
            'shipping_free'    => true,
            'discount_percent' => 10,
        ),
        'pro' => array(
            'name' => 'Pro',
            'price_ids' => array(
                'month' => 'price_REPLACE_ME_PRO_MONTHLY',
                'year'  => 'price_REPLACE_ME_PRO_YEARLY',
            ),
            'shipping_free'    => true,
            'discount_percent' => 20,
        ),
    ),

    // dashboard.stripe.com -> Developers -> Webhooks -> Add endpoint:
    //   https://riffly.com/api/billing/webhook.php
    // Events to send: customer.subscription.created, .updated, .deleted
    // Then paste the endpoint's "Signing secret" (whsec_...) here.
    'stripe_webhook_secret' => 'whsec_REPLACE_WITH_YOUR_SIGNING_SECRET',

    /* ---- Google Sign-In (optional) -----------------------------------------
     * console.cloud.google.com -> APIs & Services -> Credentials ->
     * OAuth client ID (type: Web application).
     * Authorized redirect URI:  https://riffly.com/api/auth/google-callback.php
     * Leave client_id empty to hide the "Continue with Google" button.
     */
    'google' => array(
        'client_id'     => '',
        'client_secret' => '',
    ),

    /* ---- reCAPTCHA on signup (optional) ------------------------------------
     * https://www.google.com/recaptcha/admin -> your site -> Settings.
     * Leave site_key empty to skip showing/requiring it.
     */
    'recaptcha' => array(
        'site_key'   => '',
        'secret_key' => '',
        // Only used if this turns out to be a v3 (score-based) key:
        // 'min_score' => 0.3,
    ),

    /* ---- Shipping ---------------------------------------------------------- */
    // Default: charge the per-item shipping from products.json, summed.
    // 'flat_shipping_amount' => 900,          // cents, one rate for any order
    // 'shipping_rate_id'     => 'shr_xxx',    // or a Stripe Shipping Rate id
    'shipping_label' => 'Standard shipping (2-5 business days)',
    'ship_to'        => array('US'),
    'collect_phone'  => false,
);

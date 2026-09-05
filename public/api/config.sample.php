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

    /* ---- Shipping ---------------------------------------------------------- */
    // Default: charge the per-item shipping from products.json, summed.
    // 'flat_shipping_amount' => 900,          // cents, one rate for any order
    // 'shipping_rate_id'     => 'shr_xxx',    // or a Stripe Shipping Rate id
    'shipping_label' => 'Standard shipping (2-5 business days)',
    'ship_to'        => array('US'),
    'collect_phone'  => false,
);

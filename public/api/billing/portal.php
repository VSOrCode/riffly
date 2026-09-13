<?php
/**
 * Riffly - open Stripe's Billing Portal for the signed-in user (login required).
 * POST, no body. Returns { url } to redirect to.
 */

require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/subscriptions.php';

require_post();
require_csrf();
$user = require_user();

$secret  = (string) (config()['stripe_secret_key'] ?? '');
$siteUrl = rtrim((string) (config()['site_url'] ?? ''), '/');
if ($secret === '' || $siteUrl === '') {
    json_err('Subscriptions are not switched on yet.', 503, 'not_configured');
}
if (empty($user['stripe_customer_id'])) {
    json_err('You do not have a billing account yet.', 404, 'no_customer');
}

if (is_file(__DIR__ . '/../vendor/autoload.php')) {
    require __DIR__ . '/../vendor/autoload.php';
} elseif (is_file(__DIR__ . '/../stripe-php/init.php')) {
    require __DIR__ . '/../stripe-php/init.php';
} else {
    json_err('The payment library is not installed on the server.', 500, 'library_missing');
}

\Stripe\Stripe::setApiKey($secret);

try {
    $portal = \Stripe\BillingPortal\Session::create(array(
        'customer'   => $user['stripe_customer_id'],
        'return_url' => $siteUrl . '/account.html',
    ));
} catch (\Throwable $e) {
    error_log('[riffly] billing portal error: ' . $e->getMessage());
    json_err('Could not open the billing portal. Please try again.', 502, 'stripe_error');
}

json_out(array('url' => $portal->url));

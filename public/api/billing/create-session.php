<?php
/**
 * Riffly - start a subscription checkout (login required).
 * POST { "plan": "basic"|"plus"|"pro", "interval": "month"|"year" }
 */

require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/subscriptions.php';

require_post();
require_csrf();
$user = require_user();

$secret  = (string) (config()['stripe_secret_key'] ?? '');
$siteUrl = rtrim((string) (config()['site_url'] ?? ''), '/');
if ($secret === '' || strpos($secret, 'REPLACE') !== false || $siteUrl === '') {
    json_err('Subscriptions are not switched on yet.', 503, 'not_configured');
}

if (is_file(__DIR__ . '/../vendor/autoload.php')) {
    require __DIR__ . '/../vendor/autoload.php';
} elseif (is_file(__DIR__ . '/../stripe-php/init.php')) {
    require __DIR__ . '/../stripe-php/init.php';
} else {
    json_err('The payment library is not installed on the server.', 500, 'library_missing');
}

$b = read_json_body();
$plan = (string) ($b['plan'] ?? '');
$interval = ((string) ($b['interval'] ?? 'month')) === 'year' ? 'year' : 'month';

if (!plan_exists($plan)) {
    json_err('Unknown plan.', 400, 'bad_plan');
}
$priceId = plan_price_id($plan, $interval);
if (!$priceId) {
    json_err('That plan is not fully configured yet.', 503, 'plan_not_configured');
}

$existing = user_subscription((int) $user['id']);
if (subscription_is_active($existing) && $existing['plan'] === $plan && $existing['billing_interval'] === $interval) {
    json_err('You are already on this plan.', 409, 'already_subscribed');
}

\Stripe\Stripe::setApiKey($secret);

$params = array(
    'mode'                 => 'subscription',
    'line_items'           => array(array('price' => $priceId, 'quantity' => 1)),
    'success_url'          => $siteUrl . '/account.html?sub=success',
    'cancel_url'           => $siteUrl . '/pricing.html',
    'client_reference_id'  => (string) $user['id'],
    'subscription_data'    => array(
        'metadata' => array('riffly_user' => (string) $user['id']),
    ),
);

if (!empty($user['stripe_customer_id'])) {
    $params['customer'] = $user['stripe_customer_id'];
} else {
    $params['customer_email'] = $user['email'];
}

try {
    $session = \Stripe\Checkout\Session::create($params);
} catch (\Throwable $e) {
    error_log('[riffly] subscription checkout error: ' . $e->getMessage());
    json_err('We could not start checkout just now. Please try again.', 502, 'stripe_error');
}

json_out(array('url' => $session->url));

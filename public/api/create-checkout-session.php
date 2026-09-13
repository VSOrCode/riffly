<?php
/**
 * Riffly - create a Stripe Checkout Session (login required)
 * -----------------------------------------------------------------------------
 * POST (JSON), with header  X-CSRF-Token:
 *     { "ids": ["0001","0007"] }     from the cart
 *   OR
 *     { "buy": "0001" }              from a "Buy now" button
 *
 * Prices come from ../assets/data/products.json on the server - never the client.
 * Requires: config.php, a signed-in user, and the Stripe PHP SDK
 *           (api/vendor/autoload.php or api/stripe-php/init.php).
 */

require_once __DIR__ . '/lib/auth.php';
require_once __DIR__ . '/lib/subscriptions.php';

require_post();
require_csrf();
$user = require_user();
$perks = user_perks((int) $user['id']);
$discountPercent = $perks ? $perks['discountPercent'] : 0;

$secret  = (string) (config()['stripe_secret_key'] ?? '');
$siteUrl = rtrim((string) (config()['site_url'] ?? ''), '/');

if ($secret === '' || strpos($secret, 'REPLACE') !== false || $siteUrl === '') {
    json_err('Checkout is not switched on yet.', 503, 'not_configured');
}

if (is_file(__DIR__ . '/vendor/autoload.php')) {
    require __DIR__ . '/vendor/autoload.php';
} elseif (is_file(__DIR__ . '/stripe-php/init.php')) {
    require __DIR__ . '/stripe-php/init.php';
} else {
    json_err('The payment library is not installed on the server.', 500, 'library_missing');
}

/* ------------------------------------------------------------------ input --- */
$body = read_json_body();
$ids = array();
if (!empty($body['buy'])) {
    $ids = array((string) $body['buy']);
} elseif (!empty($body['ids']) && is_array($body['ids'])) {
    $ids = array_map('strval', $body['ids']);
}
$ids = array_values(array_unique($ids));
if (!$ids) {
    json_err('Nothing to check out.', 400, 'empty_cart');
}
if (count($ids) > 50) {
    json_err('That is more items than checkout can take at once.', 400, 'too_many_items');
}

/* ---------------------------------------------------------------- catalog --- */
$catalogFile = __DIR__ . '/../assets/data/products.json';
$catalogRaw  = is_file($catalogFile) ? file_get_contents($catalogFile) : false;
$catalog     = ($catalogRaw !== false) ? json_decode($catalogRaw, true) : null;

if (!is_array($catalog) || empty($catalog['products'])) {
    json_err('The catalog is temporarily unavailable.', 500, 'catalog_unavailable');
}

$currency = strtolower((string) ($catalog['currency'] ?? 'usd'));
$byId = array();
foreach ($catalog['products'] as $p) {
    $byId[(string) $p['id']] = $p;
}

/* ------------------------------------------------ build trusted line items --- */
$lineItems     = array();
$shippingCents = 0;
$hasShippable  = false;

foreach ($ids as $id) {
    if (!isset($byId[$id])) {
        json_err('One of the items is no longer listed.', 409, 'gone');
    }
    $p = $byId[$id];
    if (($p['status'] ?? 'available') !== 'available') {
        json_err(($p['name'] ?? 'An item') . ' has just sold.', 409, 'sold');
    }

    $productData = array(
        'name'     => (string) $p['name'],
        'metadata' => array('riffly_id' => $id),
    );
    $desc = trim((string) ($p['category'] ?? '') . ' | Condition: ' . (string) ($p['condition'] ?? 'see listing'));
    if ($desc !== '') {
        $productData['description'] = $desc;
    }
    if (!empty($p['images']) && is_array($p['images'])) {
        $img = (string) $p['images'][0];
        if (strpos($img, 'http') === 0) {
            $productData['images'] = array($img);
        } elseif ($img !== '') {
            $productData['images'] = array($siteUrl . '/' . ltrim($img, '/'));
        }
    }

    $unitAmount = (int) $p['price'];
    if ($discountPercent > 0) {
        $unitAmount = (int) round($unitAmount * (100 - $discountPercent) / 100);
    }

    $lineItems[] = array(
        'quantity'   => 1,
        'price_data' => array(
            'currency'     => $currency,
            'unit_amount'  => $unitAmount,
            'product_data' => $productData,
        ),
    );

    if (empty($p['pickupOnly'])) {
        $hasShippable  = true;
        $shippingCents += (int) ($p['shipping'] ?? 0);
    }
}

if (array_key_exists('flat_shipping_amount', config()) && config()['flat_shipping_amount'] !== null) {
    $shippingCents = (int) config()['flat_shipping_amount'];
}
if ($perks && !empty($perks['freeShipping'])) {
    $shippingCents = 0;
}

/* ------------------------------------------------------- create session ---- */
\Stripe\Stripe::setApiKey($secret);
if (!empty(config()['stripe_api_version'])) {
    \Stripe\Stripe::setApiVersion((string) config()['stripe_api_version']);
}

$params = array(
    'mode'                       => 'payment',
    'line_items'                 => $lineItems,
    'customer_email'             => $user['email'],
    'client_reference_id'        => (string) $user['id'],
    'billing_address_collection' => 'auto',
    'success_url'                => $siteUrl . '/success.html?session_id={CHECKOUT_SESSION_ID}',
    'cancel_url'                 => $siteUrl . '/cancel.html',
    'metadata'                   => array(
        'riffly_user' => (string) $user['id'],
        'riffly_ids'  => implode(',', $ids),
    ),
);

if (!empty(config()['collect_phone'])) {
    $params['phone_number_collection'] = array('enabled' => true);
}

if ($hasShippable) {
    $params['shipping_address_collection'] = array(
        'allowed_countries' => config()['ship_to'] ?? array('US'),
    );
    if (!empty(config()['shipping_rate_id'])) {
        $params['shipping_options'] = array(array('shipping_rate' => (string) config()['shipping_rate_id']));
    } elseif ($shippingCents > 0) {
        $params['shipping_options'] = array(array(
            'shipping_rate_data' => array(
                'type'         => 'fixed_amount',
                'fixed_amount' => array('amount' => $shippingCents, 'currency' => $currency),
                'display_name' => (string) (config()['shipping_label'] ?? 'Standard shipping'),
            ),
        ));
    }
}

try {
    $session = \Stripe\Checkout\Session::create($params);
} catch (\Throwable $e) {
    error_log('[riffly] Stripe checkout error: ' . $e->getMessage());
    json_err('We could not start checkout just now. Please try again in a moment.', 502, 'stripe_error');
}

json_out(array('url' => $session->url));

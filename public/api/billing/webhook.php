<?php
/**
 * Riffly - Stripe webhook receiver. Stripe calls this directly (not the
 * browser), so there is no session/CSRF here - trust comes from verifying
 * Stripe's signature instead. Register this URL in the Stripe Dashboard:
 *   https://riffly.com/api/billing/webhook.php
 * Events to send: checkout.session.completed, customer.subscription.created,
 * customer.subscription.updated, customer.subscription.deleted
 */

require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/subscriptions.php';

header('Content-Type: application/json; charset=utf-8');

function webhook_fail(string $code, int $status = 400): void
{
    http_response_code($status);
    echo json_encode(array('error' => $code));
    exit;
}

$secret   = (string) (config()['stripe_secret_key'] ?? '');
$whSecret = (string) (config()['stripe_webhook_secret'] ?? '');
if ($secret === '' || $whSecret === '' || strpos($whSecret, 'REPLACE') !== false) {
    webhook_fail('not_configured', 503);
}

if (is_file(__DIR__ . '/../vendor/autoload.php')) {
    require __DIR__ . '/../vendor/autoload.php';
} elseif (is_file(__DIR__ . '/../stripe-php/init.php')) {
    require __DIR__ . '/../stripe-php/init.php';
} else {
    webhook_fail('library_missing', 500);
}

\Stripe\Stripe::setApiKey($secret);

$payload = file_get_contents('php://input');
$payload = $payload === false ? '' : $payload;
$sigHeader = (string) ($_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '');

try {
    $event = \Stripe\Webhook::constructEvent($payload, $sigHeader, $whSecret);
} catch (\Throwable $e) {
    error_log('[riffly] webhook signature check failed: ' . $e->getMessage());
    webhook_fail('bad_signature', 400);
}

try {
    $type = $event->type;
    $obj = $event->data->object;

    if (in_array($type, array('customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'), true)) {
        $sub = $obj; // \Stripe\Subscription
        $customerId = (string) $sub->customer;
        $priceId = $sub->items->data[0]->price->id ?? '';
        list($plan, $interval) = plan_and_interval_from_price($priceId);

        $userId = (int) ($sub->metadata->riffly_user ?? 0);
        $user = $userId > 0 ? find_user_by_id($userId) : find_user_by_stripe_customer($customerId);

        if ($user) {
            if (empty($user['stripe_customer_id'])) {
                db()->prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?')
                    ->execute(array($customerId, $user['id']));
            }
            upsert_subscription((int) $user['id'], array(
                'plan'                  => $plan ?? 'unknown',
                'billing_interval'      => $interval ?? 'month',
                'stripe_customer_id'    => $customerId,
                'stripe_subscription_id' => (string) $sub->id,
                'status'                => (string) $sub->status,
                'current_period_end'   => gmdate('Y-m-d H:i:s', (int) $sub->current_period_end),
                'cancel_at_period_end' => !empty($sub->cancel_at_period_end) ? 1 : 0,
            ));
        } else {
            error_log('[riffly] webhook: no local user found for stripe customer ' . $customerId);
        }
    }
} catch (\Throwable $e) {
    // Log and still acknowledge receipt so Stripe doesn't retry forever on a
    // bug that needs a code fix, not a resend.
    error_log('[riffly] webhook handling error: ' . $e->getMessage());
}

echo json_encode(array('received' => true));

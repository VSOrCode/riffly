<?php
require_once __DIR__ . '/db.php';

function plans_config(): array
{
    $p = config()['plans'] ?? array();
    return is_array($p) ? $p : array();
}

function plan_exists(string $plan): bool
{
    return isset(plans_config()[$plan]);
}

function plan_price_id(string $plan, string $interval): ?string
{
    $cfg = plans_config()[$plan] ?? null;
    if (!$cfg) {
        return null;
    }
    $id = $cfg['price_ids'][$interval] ?? null;
    return ($id && strpos((string) $id, 'REPLACE') === false) ? (string) $id : null;
}

/** The single subscription row for a user, or null if they've never subscribed. */
function user_subscription(int $userId): ?array
{
    $st = db()->prepare('SELECT * FROM subscriptions WHERE user_id = ? LIMIT 1');
    $st->execute(array($userId));
    $row = $st->fetch();
    return $row ?: null;
}

function subscription_is_active(?array $sub): bool
{
    return $sub !== null && in_array($sub['status'], array('active', 'trialing'), true);
}

/**
 * Perk summary for a user, or null if they have no active subscription.
 * This is what checkout and the frontend both read to know what a user gets.
 */
function user_perks(int $userId): ?array
{
    $sub = user_subscription($userId);
    if (!subscription_is_active($sub)) {
        return null;
    }
    $cfg = plans_config()[$sub['plan']] ?? null;
    if (!$cfg) {
        return null;
    }
    return array(
        'plan'               => $sub['plan'],
        'planName'           => (string) ($cfg['name'] ?? ucfirst($sub['plan'])),
        'interval'           => $sub['billing_interval'],
        'discountPercent'    => (int) ($cfg['discount_percent'] ?? 0),
        'freeShipping'       => !empty($cfg['shipping_free']),
        'currentPeriodEnd'   => $sub['current_period_end'],
        'cancelAtPeriodEnd'  => !empty($sub['cancel_at_period_end']),
    );
}

/** Create or update the one subscription row we keep per user. */
function upsert_subscription(int $userId, array $fields): void
{
    $existing = user_subscription($userId);
    $now = db_now();

    if ($existing) {
        $sets = array();
        $vals = array();
        foreach ($fields as $k => $v) {
            $sets[] = $k . ' = ?';
            $vals[] = $v;
        }
        $sets[] = 'updated_at = ?';
        $vals[] = $now;
        $vals[] = $userId;
        db()->prepare('UPDATE subscriptions SET ' . implode(', ', $sets) . ' WHERE user_id = ?')->execute($vals);
        return;
    }

    $fields['user_id'] = $userId;
    $fields['created_at'] = $now;
    $fields['updated_at'] = $now;
    $cols = array_keys($fields);
    $placeholders = implode(',', array_fill(0, count($cols), '?'));
    db()->prepare('INSERT INTO subscriptions (' . implode(',', $cols) . ') VALUES (' . $placeholders . ')')
        ->execute(array_values($fields));
}

function find_user_by_stripe_customer(string $customerId): ?array
{
    $st = db()->prepare('SELECT * FROM users WHERE stripe_customer_id = ? LIMIT 1');
    $st->execute(array($customerId));
    $row = $st->fetch();
    return $row ?: null;
}

/** Given a Stripe Price id, find which of our plan/interval it maps to. */
function plan_and_interval_from_price(string $priceId): array
{
    foreach (plans_config() as $planKey => $cfg) {
        foreach (($cfg['price_ids'] ?? array()) as $interval => $pid) {
            if ((string) $pid === $priceId) {
                return array($planKey, $interval);
            }
        }
    }
    return array(null, null);
}

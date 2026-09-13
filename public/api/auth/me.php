<?php
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/recaptcha.php';
require_once __DIR__ . '/../lib/subscriptions.php';

$u = current_user();
json_out(array(
    'user'             => $u ? public_user($u) : null,
    'csrf'             => csrf_token(),
    'googleEnabled'    => !empty(config()['google']['client_id']),
    'recaptchaSiteKey' => recaptcha_enabled() ? recaptcha_site_key() : null,
    'plan'             => $u ? user_perks((int) $u['id']) : null,
));

<?php
require_once __DIR__ . '/../lib/auth.php';

$u = current_user();
json_out(array(
    'user'         => $u ? public_user($u) : null,
    'csrf'         => csrf_token(),
    'googleEnabled' => !empty(config()['google']['client_id']),
));

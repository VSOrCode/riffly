<?php
require_once __DIR__ . '/../lib/auth.php';

$g = config()['google'] ?? array();
if (empty($g['client_id'])) {
    json_err('Google sign-in is not configured.', 503, 'google_off');
}

$next = isset($_GET['next']) ? (string) $_GET['next'] : '';
$state = oauth_state_issue($next);

$redirect = rtrim((string) config()['site_url'], '/') . '/api/auth/google-callback.php';

$query = http_build_query(array(
    'client_id'     => $g['client_id'],
    'redirect_uri'  => $redirect,
    'response_type' => 'code',
    // form_post keeps the auth code out of the URL entirely (Google POSTs it
    // back instead of appending it to the query string) - some hosts' WAF
    // rules mistake a long code= value in a URL for an attack.
    'response_mode' => 'form_post',
    'scope'         => 'openid email profile',
    'state'         => $state,
    'prompt'        => 'select_account',
    'access_type'   => 'online',
));

header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . $query);
exit;
